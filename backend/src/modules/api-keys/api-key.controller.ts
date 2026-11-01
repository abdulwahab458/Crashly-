import { getAuth } from "@clerk/fastify";
import { prisma } from "../../utils/db.js";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

import type { FastifyReply, FastifyRequest } from "fastify";

export async function createApiKey(request: any, reply: any) {
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
    }

export async function listApiKeys(request: any, reply: any) {
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
    }

export async function revokeApiKey(request: any, reply: any) {
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
