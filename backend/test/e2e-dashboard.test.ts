import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";

describe("E2E Dashboard & Security Verification", () => {
    let app: any;
    const userA = "clerk_user_alice_test";
    const userB = "clerk_user_bob_test";
    let projectA: any;
    let projectB: any;
    let apiKeyRecordA: any;
    let rawApiKeyA: string;

    beforeAll(async () => {
        app = await buildApp();

        // Create projects for User A and User B
        projectA = await prisma.project.create({
            data: {
                name: "Alice Production App",
                ownerId: userA
            }
        });

        projectB = await prisma.project.create({
            data: {
                name: "Bob Secret App",
                ownerId: userB
            }
        });
    });

    afterAll(async () => {
        // Clean up projects and cascaded data
        await prisma.project.deleteMany({
            where: {
                id: { in: [projectA.id, projectB.id] }
            }
        });
        await app?.close();
    });

    it("User A creates an API key for Project A", async () => {
        // Test API key generation logic via fastify route or direct prisma creation
        const keyPrefix = `etrk_live_${Date.now().toString(16)}`;
        rawApiKeyA = `${keyPrefix}_secret_token_12345`;
        const bcrypt = await import("bcrypt");
        const keyHash = await bcrypt.hash(rawApiKeyA, 4);

        apiKeyRecordA = await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: projectA.id
            }
        });

        expect(apiKeyRecordA.id).toBeDefined();
        expect(apiKeyRecordA.keyPrefix).toBe(keyPrefix);
    });

    it("SDK successfully ingests an error using active API key", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            headers: {
                "x-api-key": rawApiKeyA
            },
            payload: {
                name: "DatabaseTimeoutError",
                message: "Connection pool exhausted",
                stack: "DatabaseTimeoutError: Connection pool exhausted\n    at db.connect (/app/db.ts:12)",
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(202);
        expect(response.json()).toEqual({ status: "accepted" });
    });

    it("Error group is created with UNRESOLVED status and occurrence count 1", async () => {
        const groups = await prisma.errorGroup.findMany({
            where: { projectId: projectA.id }
        });

        expect(groups.length).toBe(1);
        expect(groups[0].name).toBe("DatabaseTimeoutError");
        expect(groups[0].status).toBe("UNRESOLVED");
        expect(groups[0].occurrenceCount).toBe(1);
    });

    it("User A resolves the error group", async () => {
        const group = await prisma.errorGroup.findFirst({
            where: { projectId: projectA.id }
        });

        const response = await app.inject({
            method: "PATCH",
            url: `/api/error-groups/${group!.id}/status`,
            headers: {
                "x-api-key": rawApiKeyA
            },
            payload: {
                status: "RESOLVED"
            }
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().group.status).toBe("RESOLVED");

        const updated = await prisma.errorGroup.findUnique({
            where: { id: group!.id }
        });
        expect(updated?.status).toBe("RESOLVED");
    });

    it("Automatic Reopening: same error recurring automatically changes status to UNRESOLVED", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            headers: {
                "x-api-key": rawApiKeyA
            },
            payload: {
                name: "DatabaseTimeoutError",
                message: "Connection pool exhausted",
                stack: "DatabaseTimeoutError: Connection pool exhausted\n    at db.connect (/app/db.ts:12)",
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(202);

        const group = await prisma.errorGroup.findFirst({
            where: { projectId: projectA.id }
        });

        expect(group?.occurrenceCount).toBe(2);
        expect(group?.status).toBe("UNRESOLVED");
    });

    it("User A can fetch summary and trends for Project A", async () => {
        const summaryRes = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary",
            headers: {
                "x-api-key": rawApiKeyA
            }
        });

        expect(summaryRes.statusCode).toBe(200);
        const summary = summaryRes.json();
        expect(summary.totalErrorGroups).toBe(1);
        expect(summary.totalEvents).toBe(2);
        expect(summary.errorsLast24Hours).toBe(2);

        const trendsRes = await app.inject({
            method: "GET",
            url: "/api/dashboard/trends?range=24h",
            headers: {
                "x-api-key": rawApiKeyA
            }
        });

        expect(trendsRes.statusCode).toBe(200);
        const trends = trendsRes.json();
        expect(trends.range).toBe("24h");
        expect(trends.data.length).toBe(24);
    });

    it("Isolation: Project B has 0 error groups and 0 events", async () => {
        const keyPrefixB = `etrk_live_${Date.now().toString(16)}b`;
        const rawApiKeyB = `${keyPrefixB}_secrettokenbob`;
        const bcrypt = await import("bcrypt");
        const keyHashB = await bcrypt.hash(rawApiKeyB, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix: keyPrefixB,
                keyHash: keyHashB,
                projectId: projectB.id
            }
        });

        const summaryResB = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary",
            headers: {
                "x-api-key": rawApiKeyB
            }
        });

        expect(summaryResB.statusCode).toBe(200);
        expect(summaryResB.json()).toEqual({
            totalErrorGroups: 0,
            totalEvents: 0,
            errorsLast24Hours: 0
        });
    });

    it("Key revocation: revoking API key causes ingestion to return 401 Unauthorized", async () => {
        // Mark apiKeyRecordA as revoked
        await prisma.apiKey.update({
            where: { id: apiKeyRecordA.id },
            data: { revokedAt: new Date() }
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            headers: {
                "x-api-key": rawApiKeyA
            },
            payload: {
                name: "ShouldFailError",
                message: "Should be rejected because key is revoked",
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({ error: "Unauthorized" });
    });
});
