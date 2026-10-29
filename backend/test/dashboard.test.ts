
import { describe, it, expect, afterAll , beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("GET /api/dashboard/summary", () => {
    let app: any;
    beforeAll(async () => {
        app = await buildApp();
    });

    it("returns dashboard metrics for the authenticated project", async () => {
        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Dashboard Test Project"
            }
        });

        const apiKey = "etrk_live_dashboard_test";
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix: "etrk_live_dashboard",
                keyHash,
                projectId: project.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `dashboard-test-${Date.now()}`,
                message: "Test error",
                name: "Error",
                projectId: project.id
            }
        });

        await prisma.errorEvent.createMany({
            data: [
                {
                    name: "Error",
                    message: "Recent event",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date()
                },
                {
                    name: "Error",
                    message: "Another recent event",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date()
                }
            ]
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalErrorGroups: 1,
            totalEvents: 2,
            errorsLast24Hours: 2
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });

    it("rejects requests without an API key", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary"
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            error: "Unauthorized"
        });
    });


    it("rejects requests with an invalid API key", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary",
            headers: {
                "x-api-key": "etrk_live_invalid_key"
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            error: "Unauthorized"
        });
    });


    it("returns metrics only for the authenticated project", async () => {
        const projectA = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Dashboard Project A"
            }
        });

        const projectB = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Dashboard Project B"
            }
        });

        const apiKey = "etrk_live_dashboard_project_a";
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix: "etrk_live_dashboard",
                keyHash,
                projectId: projectA.id
            }
        });

        const groupA = await prisma.errorGroup.create({
            data: {
                fingerprint: `dashboard-project-a-${Date.now()}`,
                message: "Project A error",
                name: "Error",
                projectId: projectA.id
            }
        });

        const groupB = await prisma.errorGroup.create({
            data: {
                fingerprint: `dashboard-project-b-${Date.now()}`,
                message: "Project B error",
                name: "Error",
                projectId: projectB.id
            }
        });

        await prisma.errorEvent.createMany({
            data: [
                {
                    name: "Error",
                    message: "Project A event",
                    projectId: projectA.id,
                    groupId: groupA.id,
                    timestamp: new Date()
                },
                {
                    name: "Error",
                    message: "Project B event",
                    projectId: projectB.id,
                    groupId: groupB.id,
                    timestamp: new Date()
                }
            ]
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalErrorGroups: 1,
            totalEvents: 1,
            errorsLast24Hours: 1
        });

        await prisma.project.deleteMany({
            where: {
                id: {
                    in: [projectA.id, projectB.id]
                }
            }
        });
    });



    it("counts only events from the last 24 hours", async () => {
        const project = await prisma.project.create({
            data: {
                ownerId: "test_owner",
                name: "Dashboard Time Test"
            }
        });

        const apiKey = "etrk_live_dashboard_time";
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix: "etrk_live_dashboard",
                keyHash,
                projectId: project.id
            }
        });

        const group = await prisma.errorGroup.create({
            data: {
                fingerprint: `dashboard-time-${Date.now()}`,
                message: "Time test error",
                name: "Error",
                projectId: project.id
            }
        });

        const now = Date.now();

        await prisma.errorEvent.createMany({
            data: [
                {
                    name: "Error",
                    message: "Recent event",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date(now - 60 * 60 * 1000)
                },
                {
                    name: "Error",
                    message: "Event from 23 hours ago",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date(now - 23 * 60 * 60 * 1000)
                },
                {
                    name: "Error",
                    message: "Old event",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date(now - 25 * 60 * 60 * 1000)
                }
            ]
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/summary",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalErrorGroups: 1,
            totalEvents: 3,
            errorsLast24Hours: 2
        });

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });




});
