
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import { generateFingerprint } from "../src/utils/fingerprint.js";
import bcrypt from "bcrypt";

describe("PATCH /api/error-groups/:groupId/status", () => {
    const app = buildApp();

    afterAll(async () => {
        await app.close();
    });

    it("marks an error group as resolved", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Error Group Status Test"
            }
        });

        const keyPrefix = `etrk_live_status${project.id.replaceAll("-", "")}`;
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
                fingerprint: `status-test-${Date.now()}`,
                message: "Status test error",
                name: "Error",
                projectId: project.id
            }
        });

        const response = await app.inject({
            method: "PATCH",
            url: `/api/error-groups/${group.id}/status`,
            headers: {
                "x-api-key": apiKey
            },
            payload: {
                status: "RESOLVED"
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().group).toMatchObject({
            id: group.id,
            status: "RESOLVED"
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });
    it("reopens a resolved error group when the same error occurs again", async () => {
        const project = await prisma.project.create({
            data: { name: "Reopen Error Test" }
        });

        const keyPrefix = `etrk_live_reopen${project.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            }
        });

        const stack = "Error: Reopen test error\n    at test.ts:1:1";
        const fingerprint = generateFingerprint(
            project.id,
            "Error",
            "Reopen test error",
            stack
        );

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint,
                message: "Reopen test error",
                name: "Error",
                projectId: project.id,
                status: "RESOLVED",
                occurrenceCount: 1
            }
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            headers: {
                "x-api-key": apiKey
            },
            payload: {
                name: "Error",
                message: "Reopen test error",
                stack,
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(202);

        const updatedGroup = await prisma.errorGroup.findUnique({
            where: { id: group.id }
        });

        expect(updatedGroup?.status).toBe("UNRESOLVED");
        expect(updatedGroup?.occurrenceCount).toBe(2);

        await prisma.project.delete({
            where: { id: project.id }
        });
    });

    it("keeps an unresolved error group unresolved when the same error occurs again", async () => {
        const project = await prisma.project.create({
            data: { name: "Unresolved Error Test" }
        });

        const keyPrefix = `etrk_live_unresolved${project.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            }
        });

        const stack = "Error: Unresolved test error\n    at test.ts:1:1";
        const fingerprint = generateFingerprint(
            project.id,
            "Error",
            "Unresolved test error",
            stack
        );

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint,
                message: "Unresolved test error",
                name: "Error",
                projectId: project.id,
                status: "UNRESOLVED",
                occurrenceCount: 1
            }
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            headers: {
                "x-api-key": apiKey
            },
            payload: {
                name: "Error",
                message: "Unresolved test error",
                stack,
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(202);

        const updatedGroup = await prisma.errorGroup.findUnique({
            where: { id: group.id }
        });

        expect(updatedGroup?.status).toBe("UNRESOLVED");
        expect(updatedGroup?.occurrenceCount).toBe(2);

        await prisma.project.delete({
            where: { id: project.id }
        });
    });

});
