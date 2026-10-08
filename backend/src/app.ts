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

    app.get<{ Params: { groupId: string } }>(
        "/api/error-groups/:groupId",
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

            const { groupId } = request.params;

            const group = await prisma.errorGroup.findFirst({
                where: {
                    id: groupId,
                    projectId: project.id
                },
                include: {
                    events: {
                        orderBy: {
                            timestamp: "desc"
                        }
                    }
                }
            });

            if (!group) {
                return reply.status(404).send({
                    error: "Error group not found"
                });
            }

            return reply.status(200).send({
                group
            });
        }
    );



    return app;
}