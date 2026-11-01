import { authenticateProject } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/db.js";
import { getAuth } from "@clerk/fastify";

import type { FastifyReply, FastifyRequest } from "fastify";

export async function listErrorGroups(request: any, reply: any) {
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
    }

export async function deleteErrorGroup(request: any, reply: any) {
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
            } catch { }
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
    }

export async function getErrorGroup(request: any, reply: any) {
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
                } catch { }
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

export async function updateErrorGroupStatus(request: any, reply: any) {
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
                } catch { }
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
