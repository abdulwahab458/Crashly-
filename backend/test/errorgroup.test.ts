import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("GET /api/error-groups", () => {

    let app: any;
    beforeAll(async () => {
        app = await buildApp();
    });
    afterAll(async () => {
        await app?.close();
    });

    it("searches error groups by name or message", async () => {
        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Error Group Search Test"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        await prisma.errorGroup.createMany({
            data: [
                {
                    fingerprint: `search-name-${project.id}`,
                    message: "Database connection failed",
                    name: "DatabaseError",
                    projectId: project.id,
                    occurrenceCount: 3
                },
                {
                    fingerprint: `search-message-${project.id}`,
                    message: "Payment provider timed out",
                    name: "TimeoutError",
                    projectId: project.id,
                    occurrenceCount: 2
                },
                {
                    fingerprint: `search-other-${project.id}`,
                    message: "Invalid request",
                    name: "ValidationError",
                    projectId: project.id,
                    occurrenceCount: 1
                }
            ]
        });

        const nameResponse = await app.inject({
            method: "GET",
            url: "/api/error-groups?search=databaseerror",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(nameResponse.statusCode).toBe(200);
        expect(nameResponse.json().groups).toHaveLength(1);
        expect(nameResponse.json().groups[0].name).toBe("DatabaseError");

        const messageResponse = await app.inject({
            method: "GET",
            url: "/api/error-groups?search=PAYMENT PROVIDER",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(messageResponse.statusCode).toBe(200);
        expect(messageResponse.json().groups).toHaveLength(1);
        expect(messageResponse.json().groups[0].message).toBe(
            "Payment provider timed out"
        );
        expect(messageResponse.json().pagination.total).toBe(1);

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });

    it("paginates events within an error group", async () => {
        const testStart = Date.now();
        console.log("Build app:", Date.now() - testStart, "ms");
        const setupStart = Date.now();
        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Event Pagination Test"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `event_pagination_${project.id}`,
                message: "Database connection failed",
                name: "Error",
                projectId: project.id,
                occurrenceCount: 5,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        await prisma.errorEvent.createMany({
            data: Array.from({ length: 5 }, (_, index) => ({
                message: `Event ${index + 1}`,
                name: "Error",
                timestamp: new Date(Date.now() + (index + 1) * 1000),
                projectId: project.id,
                groupId: group.id
            }))
        });
        console.log("Database setup:", Date.now() - setupStart, "ms");
        const requestStart = Date.now();
        const response = await app.inject({
            method: "GET",
            url: `/api/error-groups/${group.id}?page=2&limit=2`,
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.group.id).toBe(group.id);
        expect(body.events).toHaveLength(2);

        expect(body.events[0].message).toBe("Event 3");
        expect(body.events[1].message).toBe("Event 2");

        expect(body.pagination).toEqual({
            page: 2,
            limit: 2,
            total: 5,
            totalPages: 3
        });

        console.log("Request:", Date.now() - requestStart, "ms");

        const cleanupStart = Date.now();

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        console.log("Cleanup time:", Date.now() - cleanupStart, "ms");
    });


    it("searches error groups by name", async () => {

        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Error Search Test" }
        });

        const keyPrefix = `etrk_live_search${project.id.replaceAll("-", "")}`;
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
                fingerprint: `search-name-${Date.now()}`,
                name: "TypeError",
                message: "Cannot read property",
                projectId: project.id
            }
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups?search=TypeError",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups.some((item: { id: string }) => item.id === group.id))
            .toBe(true);

        expect(body.pagination.total).toBe(1);

        await prisma.project.delete({
            where: { id: project.id }
        });
    });

    it("combines search with status filtering", async () => {
        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Search Status Test" }
        });

        const keyPrefix = `etrk_live_searchstatus${project.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            }
        });

        const fingerprint = `search-status-${Date.now()}`;

        const resolvedGroup = await prisma.errorGroup.create({
            data: {
                fingerprint: `${fingerprint}-resolved`,
                name: "TypeError",
                message: "Database connection failed",
                status: "RESOLVED",
                projectId: project.id
            }
        });

        await prisma.errorGroup.create({
            data: {
                fingerprint: `${fingerprint}-unresolved`,
                name: "TypeError",
                message: "Database connection failed",
                status: "UNRESOLVED",
                projectId: project.id
            }
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups?search=TypeError&status=RESOLVED",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups).toHaveLength(1);
        expect(body.groups[0].id).toBe(resolvedGroup.id);
        expect(body.groups[0].status).toBe("RESOLVED");
        expect(body.pagination.total).toBe(1);

        await prisma.project.delete({
            where: { id: project.id }
        });
    });

    it("paginates search results correctly", async () => {
        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Search Pagination Test" }
        });

        const keyPrefix = `etrk_live_searchpage${project.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: project.id
            }
        });

        const fingerprint = `search-page-${Date.now()}`;

        for (let i = 1; i <= 3; i++) {
            await prisma.errorGroup.create({
                data: {
                    fingerprint: `${fingerprint}-${i}`,
                    name: "SearchPaginationError",
                    message: `Search pagination error ${i}`,
                    projectId: project.id
                }
            });
        }

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups?search=SearchPaginationError&page=2&limit=2",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups).toHaveLength(1);
        expect(body.pagination).toMatchObject({
            page: 2,
            limit: 2,
            total: 3,
            totalPages: 2
        });

        await prisma.project.delete({
            where: { id: project.id }
        });
    });


});