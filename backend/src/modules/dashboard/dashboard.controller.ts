import { getAuth } from "@clerk/fastify";
import { authenticateProject } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/db.js";

import type { FastifyReply, FastifyRequest } from "fastify";

export async function getDashboardSummary(request: any, reply: any) {
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

export async function getDashboardTrends(request: any, reply: any) {
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

export async function getCurrentUser(request: any, reply: any) {
        const { userId } = getAuth(request);

        if (!userId) {
            return reply.status(401).send({
                error: "Unauthorized"
            });
        }

        return reply.status(200).send({
            userId
        });
    }
