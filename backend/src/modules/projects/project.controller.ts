import { getAuth } from "@clerk/fastify";
import { prisma } from "../../utils/db.js";

import type { FastifyReply, FastifyRequest } from "fastify";

export async function createProject(request: any, reply: any) {
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
    }

export async function listProjects(request: any, reply: any) {
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
    }
