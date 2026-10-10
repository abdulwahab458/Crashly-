import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("GET /api/error-groups", () => {
    it("paginates events within an error group", async () => {
        const testStart = Date.now();
        const app = buildApp();
        console.log("Build app:", Date.now() - testStart, "ms");
        const setupStart = Date.now();
        const project = await prisma.project.create({
            data: {
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

        await app.close();

        console.log("Cleanup time:", Date.now() - cleanupStart, "ms");
    });

});