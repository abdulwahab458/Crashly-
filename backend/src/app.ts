import Fastify from "fastify";
import type { ErrorEvent } from "./types.js";
import { authenticateApiKey, authenticateProject } from "./auth.js";
import { prisma } from "./utils/db.js";
import { generateFingerprint } from "./utils/fingerprint.js";
import { clerkPlugin, getAuth } from "@clerk/fastify";
import cors from '@fastify/cors';
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

export async function buildApp() {
    const app = Fastify({
        logger: true
    });

    await app.register(cors, {
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
});

    await app.register(clerkPlugin);

    app.get("/health", async () => {
        return {
            status: "ok"
        };
    });

    app.post<{ Body: ErrorEvent }>(
        "/api/events",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["message", "name", "timestamp"],
                    properties: {
                        message: { type: "string" },
                        name: { type: "string" },
                        stack: { type: "string" },
                        timestamp: { type: "string" }
                    },
                    additionalProperties: false
                }
            }
        },
        async (request, reply) => {
            const apiKey = request.headers["x-api-key"];

            if (typeof apiKey !== "string") {
                return reply.code(401).send({
                    error: "Unauthorized"
                });
            }

            const project = await authenticateApiKey(apiKey);

            if (!project) {
                return reply.code(401).send({
                    error: "Unauthorized"
                });
            }

            const event = request.body;

            const fingerprint = generateFingerprint(
                project.id,
                event.name,
                event.message,
                event.stack
            );
            const eventTimestamp = new Date(event.timestamp);

            const group = await prisma.errorGroup.upsert({
                where: {
                    fingerprint
                },
                create: {
                    fingerprint,
                    message: event.message,
                    name: event.name,
                    projectId: project.id,
                    occurrenceCount: 1,
                    firstSeenAt: eventTimestamp,
                    lastSeenAt: eventTimestamp,
                    status: "UNRESOLVED"
                },
                update: {
                    occurrenceCount: {
                        increment: 1
                    },
                    lastSeenAt: eventTimestamp,
                    status: "UNRESOLVED",
                }
            });

            await prisma.errorEvent.create({
                data: {
                    message: event.message,
                    name: event.name,
                    stack: event.stack,
                    timestamp: event.timestamp,
                    projectId: project.id,
                    groupId: group.id
                }
            });

            console.log("Received error event:", event);

            return reply.code(202).send({
                status: "accepted"
            });
        }
    );

    app.get("/api/events", async (request, reply) => {
        const apiKey = request.headers["x-api-key"];

        if (typeof apiKey !== "string") {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const project = await authenticateApiKey(apiKey);

        if (!project) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const events = await prisma.errorEvent.findMany({
            where: {
                projectId: project.id
            },
            orderBy: {
                timestamp: "desc"
            }
        });

        return reply.status(200).send({
            events
        });
    });

    app.get("/api/error-groups", async (request, reply) => {
        const project = await authenticateProject(request);

        if (!project) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const query = request.query as {
            page?: string;
            limit?: string;
            status?: string;
            search?: string;
        };
        const search = query.search?.trim();

        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(
            Math.max(Number(query.limit) || 20, 1),
            100
        );

        const status = query.status;

        if (
            status !== undefined &&
            status !== "UNRESOLVED" &&
            status !== "RESOLVED"
        ) {
            return reply.status(400).send({
                error: "Invalid status. Use UNRESOLVED or RESOLVED."
            });
        }

        const skip = (page - 1) * limit;


        const [groups, total] = await Promise.all([
            prisma.errorGroup.findMany({
                where: {
                    projectId: project.id,
                    ...(status ? { status } : {}),
                    ...(search
                        ? {
                            OR: [
                                {
                                    name: {
                                        contains: search,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    message: {
                                        contains: search,
                                        mode: "insensitive"
                                    }
                                }
                            ]
                        }
                        : {})
                },
                orderBy: {
                    occurrenceCount: "desc"
                },
                skip,
                take: limit
            }),
            prisma.errorGroup.count({
                where: {
                    projectId: project.id,
                    ...(status ? { status } : {}),
                    ...(search
                        ? {
                            OR: [
                                {
                                    name: {
                                        contains: search,
                                        mode: "insensitive"
                                    }
                                },
                                {
                                    message: {
                                        contains: search,
                                        mode: "insensitive"
                                    }
                                }
                            ]
                        }
                        : {})
                }
            })
        ]);


        return reply.status(200).send({
            groups,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    });


    app.delete<{
        Params: {
            groupId: string;
        };
    }>("/api/error-groups/:groupId", async (request, reply) => {
        let project = await authenticateProject(request);

        if (!project) {
            try {
                const { userId } = getAuth(request);
                if (userId) {
                    const g = await prisma.errorGroup.findFirst({
                        where: {
                            id: request.params.groupId,
                            project: { ownerId: userId }
                        },
                        include: { project: true }
                    });
                    if (g) project = g.project;
                }
            } catch {}
        }

        if (!project) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const { groupId } = request.params;

        const group = await prisma.errorGroup.findFirst({
            where: {
                id: groupId,
                projectId: project.id
            },
            select: {
                id: true
            }
        });

        if (!group) {
            return reply.status(404).send({
                error: "Error group not found"
            });
        }

        await prisma.errorGroup.delete({
            where: {
                id: group.id
            }
        });

        return reply.status(200).send({
            message: "Error group deleted successfully"
        });
    });



    app.get<{
        Params: { groupId: string };
        Querystring: { page?: string; limit?: string };
    }>(
        "/api/error-groups/:groupId",
        async (request, reply) => {
            const requestStart = performance.now();

            const logTime = (label: string, start: number) => {
                console.log(
                    `[Error Group Detail] ${label}: ${(performance.now() - start).toFixed(0)}ms`
                );
            };

            let stepStart = performance.now();

            let project = await authenticateProject(request);

            if (!project) {
                try {
                    const { userId } = getAuth(request);
                    if (userId) {
                        const g = await prisma.errorGroup.findFirst({
                            where: {
                                id: request.params.groupId,
                                project: { ownerId: userId }
                            },
                            include: { project: true }
                        });
                        if (g) project = g.project;
                    }
                } catch {}
            }

            logTime("Authentication", stepStart);

            if (!project) {
                return reply.status(401).send({
                    error: "Unauthorized"
                });
            }

            const { groupId } = request.params;

            const pageValue = Number(request.query.page ?? 1);
            const limitValue = Number(request.query.limit ?? 20);

            const page = Number.isSafeInteger(pageValue) && pageValue > 0
                ? pageValue
                : 1;

            const limit = Number.isSafeInteger(limitValue) && limitValue > 0
                ? Math.min(limitValue, 100)
                : 20;

            const skip = (page - 1) * limit;

            stepStart = performance.now();

            const [group, total] = await Promise.all([
                prisma.errorGroup.findFirst({
                    where: {
                        id: groupId,
                        projectId: project.id
                    },
                    include: {
                        events: {
                            where: {
                                projectId: project.id
                            },
                            orderBy: {
                                timestamp: "desc"
                            },
                            skip,
                            take: limit
                        }
                    }
                }),

                prisma.errorEvent.count({
                    where: {
                        groupId,
                        projectId: project.id
                    }
                })
            ]);

            logTime("Group lookup + events query + count", stepStart);

            if (!group) {
                return reply.status(404).send({
                    error: "Error group not found"
                });
            }

            const { events, ...groupData } = group;

            const response = reply.status(200).send({
                group: groupData,
                events,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

            logTime("Total route execution", requestStart);

            return response;
        }
    );


    app.get(
        "/api/dashboard/summary",
        async (request, reply) => {
            const project = await authenticateProject(request);

            if (!project) {
                return reply.status(401).send({
                    error: "Unauthorized"
                });
            }

            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const [
                totalErrorGroups,
                totalEvents,
                errorsLast24Hours
            ] = await Promise.all([
                prisma.errorGroup.count({
                    where: {
                        projectId: project.id
                    }
                }),

                prisma.errorEvent.count({
                    where: {
                        projectId: project.id
                    }
                }),

                prisma.errorEvent.count({
                    where: {
                        projectId: project.id,
                        timestamp: {
                            gte: since
                        }
                    }
                })
            ]);

            return reply.status(200).send({
                totalErrorGroups,
                totalEvents,
                errorsLast24Hours
            });
        }
    );


    app.get<{
        Querystring: {
            range?: string;
        };
    }>(
        "/api/dashboard/trends",
        async (request, reply) => {
            const project = await authenticateProject(request);

            if (!project) {
                return reply.status(401).send({
                    error: "Unauthorized"
                });
            }

            const range = request.query.range ?? "24h";

            if (range !== "24h" && range !== "7d") {
                return reply.status(400).send({
                    error: "Invalid range. Use 24h or 7d."
                });
            }

            const now = new Date();
            const bucketSize = range === "24h"
                ? 60 * 60 * 1000
                : 24 * 60 * 60 * 1000;

            const bucketCount = range === "24h" ? 24 : 7;
            const startTime = new Date(
                Math.floor(now.getTime() / bucketSize) * bucketSize
                - (bucketCount - 1) * bucketSize
            );

            const events = await prisma.errorEvent.findMany({
                where: {
                    projectId: project.id,
                    timestamp: {
                        gte: startTime,
                        lte: now
                    }
                },
                select: {
                    timestamp: true
                }
            });

            const counts = new Map<number, number>();

            for (const event of events) {
                const bucket = Math.floor(
                    event.timestamp.getTime() / bucketSize
                ) * bucketSize;

                counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
            }

            const data = Array.from(
                { length: bucketCount },
                (_, index) => {
                    const timestamp = startTime.getTime() + index * bucketSize;

                    return {
                        timestamp: new Date(timestamp).toISOString(),
                        count: counts.get(timestamp) ?? 0
                    };
                }
            );

            return reply.status(200).send({
                range,
                data
            });
        }
    );



    app.patch<{
        Params: { groupId: string };
        Body: { status: "UNRESOLVED" | "RESOLVED" };
    }>(
        "/api/error-groups/:groupId/status",
        async (request, reply) => {
            let project = await authenticateProject(request);

            if (!project) {
                try {
                    const { userId } = getAuth(request);
                    if (userId) {
                        const g = await prisma.errorGroup.findFirst({
                            where: {
                                id: request.params.groupId,
                                project: { ownerId: userId }
                            },
                            include: { project: true }
                        });
                        if (g) project = g.project;
                    }
                } catch {}
            }

            if (!project) {
                return reply.status(401).send({
                    error: "Unauthorized"
                });
            }

            const { groupId } = request.params;
            const { status } = request.body ?? {};

            if (status !== "UNRESOLVED" && status !== "RESOLVED") {
                return reply.status(400).send({
                    error: "Invalid status. Use UNRESOLVED or RESOLVED."
                });
            }

            const group = await prisma.errorGroup.findFirst({
                where: {
                    id: groupId,
                    projectId: project.id
                },
                select: {
                    id: true
                }
            });

            if (!group) {
                return reply.status(404).send({
                    error: "Error group not found"
                });
            }

            const updatedGroup = await prisma.errorGroup.update({
                where: {
                    id: group.id
                },
                data: {
                    status
                },
                select: {
                    id: true,
                    status: true,
                    updatedAt: true
                }
            });

            return reply.status(200).send({
                group: updatedGroup
            });
        }
    );


    app.get("/api/dashboard/me", async (request, reply) => {
        const { userId } = getAuth(request);

        if (!userId) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        return reply.status(200).send({
            userId
        });
    });

    app.post<{
        Body: {
            name?: string;
        };
    }>("/api/dashboard/projects", async (request, reply) => {
        const { userId } = getAuth(request);

        if (!userId) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const { name } = request.body ?? {};

        if (typeof name !== "string" || !name.trim()) {
            return reply.status(400).send({
                error: "Project name is required"
            });
        }

        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                ownerId: userId
            },
            select: {
                id: true,
                name: true,
                ownerId: true,
                createdAt: true
            }
        });

        return reply.status(201).send({
            project
        });
    });


    app.get("/api/dashboard/projects", async (request, reply) => {
        const { userId } = getAuth(request);

        if (!userId) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const projects = await prisma.project.findMany({
            where: {
                ownerId: userId
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return reply.status(200).send({
            projects
        });
    });


    app.post<{
        Params: {
            projectId: string;
        };
    }>("/api/dashboard/projects/:projectId/api-keys", async (request, reply) => {
        const { userId } = getAuth(request);

        if (!userId) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const { projectId } = request.params;

        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                ownerId: userId
            },
            select: {
                id: true
            }
        });

        if (!project) {
            return reply.status(404).send({
                error: "Project not found"
            });
        }

        const keyPrefix = `etrk_live_${randomBytes(6).toString("hex")}`;
        const apiKey = `${keyPrefix}_${randomBytes(24).toString("hex")}`;
        const keyHash = await bcrypt.hash(apiKey, 10);

        const savedKey = await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            },
            select: {
                id: true,
                keyPrefix: true,
                createdAt: true
            }
        });

        return reply.status(201).send({
            apiKey,
            key: savedKey
        });
    });

    app.get<{
        Params: {
            projectId: string;
        };
    }>("/api/dashboard/projects/:projectId/api-keys", async (request, reply) => {
        const { userId } = getAuth(request);

        if (!userId) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        const { projectId } = request.params;

        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                ownerId: userId
            },
            select: {
                id: true
            }
        });

        if (!project) {
            return reply.status(404).send({
                error: "Project not found"
            });
        }

        const apiKeys = await prisma.apiKey.findMany({
            where: {
                projectId: project.id
            },
            select: {
                id: true,
                keyPrefix: true,
                createdAt: true,
                revokedAt: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return reply.status(200).send({
            apiKeys
        });
    });

    app.delete<{
        Params: {
            projectId: string;
            keyId: string;
        };
    }>(
        "/api/dashboard/projects/:projectId/api-keys/:keyId",
        async (request, reply) => {
            const { userId } = getAuth(request);

            if (!userId) {
                return reply.status(401).send({
                    error: "Unauthorized"
                });
            }

            const { projectId, keyId } = request.params;

            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    ownerId: userId
                },
                select: {
                    id: true
                }
            });

            if (!project) {
                return reply.status(404).send({
                    error: "Project not found"
                });
            }

            const apiKey = await prisma.apiKey.findFirst({
                where: {
                    id: keyId,
                    projectId: project.id
                },
                select: {
                    id: true,
                    revokedAt: true
                }
            });

            if (!apiKey) {
                return reply.status(404).send({
                    error: "API key not found"
                });
            }

            if (apiKey.revokedAt) {
                return reply.status(409).send({
                    error: "API key is already revoked"
                });
            }

            const revokedKey = await prisma.apiKey.update({
                where: {
                    id: apiKey.id
                },
                data: {
                    revokedAt: new Date()
                },
                select: {
                    id: true,
                    keyPrefix: true,
                    revokedAt: true
                }
            });

            return reply.status(200).send({
                message: "API key revoked successfully",
                key: revokedKey
            });
        }
    );


    return app;
}