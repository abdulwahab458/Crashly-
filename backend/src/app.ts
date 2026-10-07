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

            let group = await prisma.errorGroup.findUnique({
                where: {
                    fingerprint
                }
            });

            if (!group) {
                group = await prisma.errorGroup.create({
                    data: {
                        fingerprint,
                        message: event.message,
                        name: event.name,
                        projectId: project.id
                    }
                });
            }

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

    return app;
}