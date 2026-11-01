import type { ErrorEvent } from "../../types/index.js";
import { authenticateApiKey } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/db.js";
import { generateFingerprint } from "../../utils/fingerprint.js";

import type { FastifyReply, FastifyRequest } from "fastify";

export async function ingestEvent(request: any, reply: any) {
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

    const origin = request.headers.origin;

    if (origin) {
        const allowedOrigin = await prisma.allowedOrigin.findUnique({
            where: {
                projectId_origin: {
                    projectId: project.id,
                    origin
                }
            }
        });

        if (!allowedOrigin) {
            return reply.code(403).send({
                error: "Origin not allowed"
            });
        }
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

export async function listEvents(request: any, reply: any) {
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
}
