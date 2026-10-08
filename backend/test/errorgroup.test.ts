import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("GET /api/error-groups", () => {
    it("returns error groups for the authenticated project", async () => {
        const app = buildApp();

        const project = await prisma.project.create({
            data: {
                name: "Error Groups Test Project"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `fingerprint_${project.id}`,
                message: "Database connection failed",
                name: "Error",
                projectId: project.id,
                occurrenceCount: 5,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups).toHaveLength(1);
        expect(body.groups[0].id).toBe(group.id);
        expect(body.groups[0].message).toBe("Database connection failed");
        expect(body.groups[0].occurrenceCount).toBe(5);

        await prisma.apiKey.deleteMany({
            where: {
                projectId: project.id
            }
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        await app.close();
    });
    it("returns only error groups belonging to the authenticated project", async () => {
        const app = buildApp();

        const projectA = await prisma.project.create({
            data: {
                name: "Project A"
            }
        });

        const projectB = await prisma.project.create({
            data: {
                name: "Project B"
            }
        });

        const apiKey = `etrk_test_${projectA.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${projectA.id}`,
                keyHash: hash,
                projectId: projectA.id
            }
        });

        await prisma.errorGroup.create({
            data: {
                fingerprint: `fingerprint_a_${projectA.id}`,
                message: "Project A error",
                name: "Error",
                projectId: projectA.id,
                occurrenceCount: 10,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        await prisma.errorGroup.create({
            data: {
                fingerprint: `fingerprint_b_${projectB.id}`,
                message: "Project B error",
                name: "Error",
                projectId: projectB.id,
                occurrenceCount: 20,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups).toHaveLength(1);
        expect(body.groups[0].message).toBe("Project A error");
        expect(body.groups[0].projectId).toBe(projectA.id);

        await prisma.apiKey.deleteMany({
            where: {
                projectId: {
                    in: [projectA.id, projectB.id]
                }
            }
        });

        await prisma.project.deleteMany({
            where: {
                id: {
                    in: [projectA.id, projectB.id]
                }
            }
        });

        await app.close();
    });

    it("returns error groups ordered by occurrence count", async () => {
        const app = buildApp();

        const project = await prisma.project.create({
            data: {
                name: "Ordering Test Project"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        await prisma.errorGroup.create({
            data: {
                fingerprint: `low_${project.id}`,
                message: "Low frequency error",
                name: "Error",
                projectId: project.id,
                occurrenceCount: 2,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        await prisma.errorGroup.create({
            data: {
                fingerprint: `high_${project.id}`,
                message: "High frequency error",
                name: "Error",
                projectId: project.id,
                occurrenceCount: 20,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        await prisma.errorGroup.create({
            data: {
                fingerprint: `medium_${project.id}`,
                message: "Medium frequency error",
                name: "Error",
                projectId: project.id,
                occurrenceCount: 10,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups).toHaveLength(3);

        expect(body.groups[0].message).toBe("High frequency error");
        expect(body.groups[1].message).toBe("Medium frequency error");
        expect(body.groups[2].message).toBe("Low frequency error");

        expect(body.groups[0].occurrenceCount).toBe(20);
        expect(body.groups[1].occurrenceCount).toBe(10);
        expect(body.groups[2].occurrenceCount).toBe(2);

        await prisma.apiKey.deleteMany({
            where: {
                projectId: project.id
            }
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        await app.close();
    });

    it("rejects a request without an API key", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups"
        });

        expect(response.statusCode).toBe(401);

        expect(response.json()).toEqual({
            error: "Unauthorized"
        });

        await app.close();
    });

    it("rejects an invalid API key", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups",
            headers: {
                "x-api-key": "etrk_test_invalid_secret"
            }
        });

        expect(response.statusCode).toBe(401);

        expect(response.json()).toEqual({
            error: "Unauthorized"
        });

        await app.close();
    });
    it("paginates error groups", async () => {
        const app = buildApp();

        const project = await prisma.project.create({
            data: {
                name: "Pagination Test Project"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        for (let i = 1; i <= 5; i++) {
            await prisma.errorGroup.create({
                data: {
                    fingerprint: `pagination_${project.id}_${i}`,
                    message: `Error ${i}`,
                    name: "Error",
                    projectId: project.id,
                    occurrenceCount: i,
                    firstSeenAt: new Date(),
                    lastSeenAt: new Date()
                }
            });
        }

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups?page=2&limit=2",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.groups).toHaveLength(2);

        expect(body.groups[0].message).toBe("Error 3");
        expect(body.groups[1].message).toBe("Error 2");

        expect(body.pagination).toEqual({
            page: 2,
            limit: 2,
            total: 5,
            totalPages: 3
        });

        await prisma.apiKey.deleteMany({
            where: {
                projectId: project.id
            }
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        await app.close();
    });

    it("returns an error group with its events", async () => {
        const app = buildApp();

        const project = await prisma.project.create({
            data: {
                name: "Details Test Project"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `details_${project.id}`,
                message: "Database connection failed",
                name: "Error",
                projectId: project.id,
                occurrenceCount: 2,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        await prisma.errorEvent.create({
            data: {
                message: "Database connection failed",
                name: "Error",
                stack: "Error: Database connection failed",
                timestamp: new Date(),
                projectId: project.id,
                groupId: group.id
            }
        });

        const response = await app.inject({
            method: "GET",
            url: `/api/error-groups/${group.id}`,
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.group.id).toBe(group.id);
        expect(body.group.message).toBe("Database connection failed");
        expect(body.group.events).toHaveLength(1);
        expect(body.group.events[0].message).toBe(
            "Database connection failed"
        );

        await prisma.apiKey.deleteMany({
            where: {
                projectId: project.id
            }
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        await app.close();
    });

    it("rejects access to an error group belonging to another project", async () => {
        const app = buildApp();

        const projectA = await prisma.project.create({
            data: {
                name: "Project A"
            }
        });

        const projectB = await prisma.project.create({
            data: {
                name: "Project B"
            }
        });

        const apiKeyA = `etrk_test_${projectA.id}_secret`;
        const hashA = await bcrypt.hash(apiKeyA, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${projectA.id}`,
                keyHash: hashA,
                projectId: projectA.id
            }
        });

        const groupB = await prisma.errorGroup.create({
            data: {
                fingerprint: `cross_project_${projectB.id}`,
                message: "Project B secret error",
                name: "Error",
                projectId: projectB.id,
                occurrenceCount: 1,
                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });

        const response = await app.inject({
            method: "GET",
            url: `/api/error-groups/${groupB.id}`,
            headers: {
                "x-api-key": apiKeyA
            }
        });

        expect(response.statusCode).toBe(404);

        expect(response.json()).toEqual({
            error: "Error group not found"
        });

        await prisma.apiKey.deleteMany({
            where: {
                projectId: {
                    in: [projectA.id, projectB.id]
                }
            }
        });

        await prisma.project.deleteMany({
            where: {
                id: {
                    in: [projectA.id, projectB.id]
                }
            }
        });

        await app.close();
    });
    it("returns 404 when the error group does not exist", async () => {
        const app = buildApp();

        const project = await prisma.project.create({
            data: {
                name: "Missing Group Test Project"
            }
        });

        const apiKey = `etrk_test_${project.id}_secret`;
        const hash = await bcrypt.hash(apiKey, 12);

        await prisma.apiKey.create({
            data: {
                keyPrefix: `etrk_test_${project.id}`,
                keyHash: hash,
                projectId: project.id
            }
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/error-groups/00000000-0000-0000-0000-000000000000",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(404);

        expect(response.json()).toEqual({
            error: "Error group not found"
        });

        await prisma.apiKey.deleteMany({
            where: {
                projectId: project.id
            }
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });

        await app.close();
    });
});