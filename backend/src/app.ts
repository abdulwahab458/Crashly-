import Fastify from "fastify";
import type { ErrorEvent } from "./types.js";
import { authenticateApiKey } from "./auth.js";
import { prisma } from "./utils/db.js";
import { generateFingerprint } from "./utils/fingerprint.js";

export function buildApp() {
    const app = Fastify({
        logger: true
    });

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
                    lastSeenAt: eventTimestamp
                },
                update: {
                    occurrenceCount: {
                        increment: 1
                    },
                    lastSeenAt: eventTimestamp
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

        const query = request.query as {
            page?: string;
            limit?: string;
        };

        const page = Math.max(Number(query.page) || 1, 1);
        const limit = Math.min(
            Math.max(Number(query.limit) || 20, 1),
            100
        );

        const skip = (page - 1) * limit;

        const [groups, total] = await Promise.all([
            prisma.errorGroup.findMany({
                where: {
                    projectId: project.id
                },
                orderBy: {
                    occurrenceCount: "desc"
                },
                skip,
                take: limit
            }),
            prisma.errorGroup.count({
                where: {
                    projectId: project.id
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

            const apiKey = request.headers["x-api-key"];

            if (typeof apiKey !== "string") {
                return reply.status(401).send({
                    error: "Unauthorized"
                });
            }

            let stepStart = performance.now();

            const project = await authenticateApiKey(apiKey);

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







    return app;
}