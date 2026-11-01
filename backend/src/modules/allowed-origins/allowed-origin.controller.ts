import { getAuth } from "@clerk/fastify";
import { prisma } from "../../utils/db.js";
import type { FastifyRequest, FastifyReply } from "fastify";

export async function addAllowedOrigin(request: FastifyRequest<{
    Params: { projectId: string };
    Body: { origin?: string };
}>, reply: FastifyReply) {
    const { userId } = getAuth(request);

    if (!userId) {
        return reply.status(401).send({
            error: "Unauthorized"
        });
    }

    const { projectId } = request.params;
    const { origin } = request.body ?? {};

    if (typeof origin !== "string" || !origin.trim()) {
        return reply.status(400).send({
            error: "Origin is required"
        });
    }

    let normalizedOrigin: string;

    try {
        const url = new URL(origin.trim());

        if (
            !["http:", "https:"].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.origin === "null" ||
            (url.pathname !== "/" && url.pathname !== "") ||
            url.search ||
            url.hash
        ) {
            return reply.status(400).send({
                error: "Provide a valid origin without a path, query or hash"
            });
        }

        normalizedOrigin = url.origin;
    } catch {
        return reply.status(400).send({
            error: "Invalid origin"
        });
    }

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

    const existingOrigin = await prisma.allowedOrigin.findUnique({
        where: {
            projectId_origin: {
                projectId,
                origin: normalizedOrigin
            }
        }
    });

    if (existingOrigin) {
        return reply.status(409).send({
            error: "Origin already exists"
        });
    }

    const allowedOrigin = await prisma.allowedOrigin.create({
        data: {
            origin: normalizedOrigin,
            projectId
        }
    });

    return reply.status(201).send({
        allowedOrigin
    });
}

export async function listAllowedOrigins(request: FastifyRequest<{
    Params: { projectId: string };
}>, reply: FastifyReply) {
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

    const origins = await prisma.allowedOrigin.findMany({
        where: {
            projectId
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    return reply.status(200).send({
        origins
    });
}

export async function deleteAllowedOrigin(request: FastifyRequest<{
    Params: {
        projectId: string;
        originId: string;
    };
}>, reply: FastifyReply) {
    const { userId } = getAuth(request);

    if (!userId) {
        return reply.status(401).send({
            error: "Unauthorized"
        });
    }

    const { projectId, originId } = request.params;

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

    const origin = await prisma.allowedOrigin.findFirst({
        where: {
            id: originId,
            projectId
        }
    });

    if (!origin) {
        return reply.status(404).send({
            error: "Origin not found"
        });
    }

    await prisma.allowedOrigin.delete({
        where: {
            id: originId
        }
    });

    return reply.status(200).send({
        message: "Origin deleted successfully"
    });
}