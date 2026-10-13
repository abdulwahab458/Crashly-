import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("DELETE /api/error-groups/:groupId", () => {
    const app = buildApp();

    afterAll(async () => {
        await app.close();
    });

    it("deletes an error group and its associated events", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Error Group Delete Test"
            }
        });

        const keyPrefix = `etrk_live_delete${project.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `delete-test-${Date.now()}`,
                name: "DeleteTestError",
                message: "Error to delete",
                projectId: project.id
            }
        });

        await prisma.errorEvent.createMany({
            data: [
                {
                    projectId: project.id,
                    groupId: group.id,
                    name: "DeleteTestError",
                    message: "Error to delete",
                    stack: "Error stack 1",
                    timestamp: new Date()
                },
                {
                    projectId: project.id,
                    groupId: group.id,
                    name: "DeleteTestError",
                    message: "Error to delete",
                    stack: "Error stack 2",
                    timestamp: new Date()
                }
            ]
        });

        const response = await app.inject({
            method: "DELETE",
            url: `/api/error-groups/${group.id}`,
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const deletedGroup = await prisma.errorGroup.findUnique({
            where: {
                id: group.id
            }
        });

        const remainingEvents = await prisma.errorEvent.count({
            where: {
                groupId: group.id
            }
        });

        expect(deletedGroup).toBeNull();
        expect(remainingEvents).toBe(0);

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });

    it("returns 404 when the error group does not exist", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Delete Missing Group Test"
            }
        });

        const keyPrefix = `etrk_live_missing${project.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            }
        });

        const response = await app.inject({
            method: "DELETE",
            url: "/api/error-groups/nonexistent-group-id",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toMatchObject({
            error: "Error group not found"
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });

    it("prevents deleting an error group belonging to another project", async () => {
        const projectA = await prisma.project.create({
            data: {
                name: "Delete Isolation Project A"
            }
        });

        const projectB = await prisma.project.create({
            data: {
                name: "Delete Isolation Project B"
            }
        });

        const keyPrefix = `etrk_live_isolation${projectA.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: projectA.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `isolation-delete-${Date.now()}`,
                name: "ProtectedError",
                message: "This group must not be deleted",
                projectId: projectB.id
            }
        });

        const response = await app.inject({
            method: "DELETE",
            url: `/api/error-groups/${group.id}`,
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toMatchObject({
            error: "Error group not found"
        });

        const existingGroup = await prisma.errorGroup.findUnique({
            where: {
                id: group.id
            }
        });

        expect(existingGroup).not.toBeNull();

        await prisma.project.delete({
            where: {
                id: projectA.id
            }
        });

        await prisma.project.delete({
            where: {
                id: projectB.id
            }
        });
    });
    it("returns 401 when the API key is missing", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: "/api/error-groups/some-group-id"
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toMatchObject({
            error: "Unauthorized"
        });
    });
    it("returns 401 when the API key is invalid", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: "/api/error-groups/some-group-id",
            headers: {
                "x-api-key": "invalid_api_key"
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toMatchObject({
            error: "Unauthorized"
        });
    });
});