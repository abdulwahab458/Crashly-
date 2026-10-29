import bcrypt from "bcrypt";
import { prisma } from "./utils/db.js";
import { getAuth } from "@clerk/fastify";
import type { FastifyRequest } from "fastify";

export async function authenticateApiKey(apiKey: string) {
    const separatorIndex = apiKey.indexOf("_", "etrk_live_".length);

    if (separatorIndex === -1) {
        return null;
    }

    const keyPrefix = apiKey.slice(0, separatorIndex);

    const key = await prisma.apiKey.findUnique({
        where: {
            keyPrefix,
            revokedAt: null
        },
        include: {
            project: true
        }
    });

    if (!key) {
        return null;
    }

    const valid = await bcrypt.compare(apiKey, key.keyHash);

    if (!valid) {
        return null;
    }

    return key.project;
}

export async function authenticateProject(
    request: FastifyRequest,
    explicitProjectId?: string
) {
    const apiKey = request.headers["x-api-key"];

    if (typeof apiKey === "string") {
        return await authenticateApiKey(apiKey);
    }

    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return null;
        }

        const projectId =
            explicitProjectId ??
            (request.query as { projectId?: string })?.projectId ??
            (request.headers["x-project-id"] as string);

        if (!projectId) {
            return null;
        }

        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                ownerId: userId
            }
        });

        return project;
    } catch {
        return null;
    }
}
