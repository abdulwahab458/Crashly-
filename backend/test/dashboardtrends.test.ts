
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("GET /api/dashboard/trends", () => {
    const app = buildApp();

    it("returns 24 hourly buckets for the last 24 hours", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Trends Test Project"
            }
        });

        const keyPrefix = `etrk_live_trendsbuckets${project.id.replaceAll("-", "")}`;
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
            method: "GET",
            url: "/api/dashboard/trends?range=24h",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.range).toBe("24h");
        expect(body.data).toHaveLength(24);

        for (const bucket of body.data) {
            expect(bucket).toHaveProperty("timestamp");
            expect(bucket).toHaveProperty("count");
            expect(typeof bucket.count).toBe("number");
        }

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });

    it("counts events in the correct hourly buckets", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Trends Count Test"
            }
        });

        const keyPrefix = `etrk_live_trendscount${project.id.replaceAll("-", "")}`;
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
                fingerprint: `trends-count-${Date.now()}`,
                message: "Trends test error",
                name: "Error",
                projectId: project.id
            }
        });

        const now = new Date();
        const currentHour = new Date(now);
        currentHour.setUTCMinutes(0, 0, 0);

        await prisma.errorEvent.createMany({
            data: [
                {
                    name: "Error",
                    message: "Event one",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date(currentHour.getTime() + 1000)
                },
                {
                    name: "Error",
                    message: "Event two",
                    projectId: project.id,
                    groupId: group.id,
                    timestamp: new Date(currentHour.getTime() + 2000)
                }
            ]
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/trends?range=24h",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();
        const currentBucket = body.data[body.data.length - 1];

        expect(currentBucket.count).toBe(2);

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });


    it("returns 7 daily buckets for the last 7 days", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Trends Weekly Test"
            }
        });

        const keyPrefix = `etrk_live_trendsweek${project.id.replaceAll("-", "")}`;
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
            method: "GET",
            url: "/api/dashboard/trends?range=7d",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.range).toBe("7d");
        expect(body.data).toHaveLength(7);

        for (const bucket of body.data) {
            expect(bucket).toHaveProperty("timestamp");
            expect(bucket).toHaveProperty("count");
            expect(typeof bucket.count).toBe("number");
        }

        await prisma.project.delete({
            where: {
                id: project.id
            }
        });
    });


    it("rejects an invalid range", async () => {
        const project = await prisma.project.create({
            data: {
                name: "Trends Invalid Range Test"
            }
        });

        const keyPrefix = `etrk_live_trendsinvalid${project.id.replaceAll("-", "")}`;
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
            method: "GET",
            url: "/api/dashboard/trends?range=30d",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: "Invalid range. Use 24h or 7d."
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
            url: "/api/dashboard/trends?range=24h"
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            error: "Unauthorized"
        });
    });

    it("rejects requests with an invalid API key", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/trends?range=24h",
            headers: {
                "x-api-key": "etrk_live_invalid_trends_key"
            }
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            error: "Unauthorized"
        });
    });


    it("returns trends only for the authenticated project", async () => {
        const projectA = await prisma.project.create({
            data: {
                name: "Trends Project A"
            }
        });

        const projectB = await prisma.project.create({
            data: {
                name: "Trends Project B"
            }
        });

        const keyPrefix = `etrk_live_trendsisolation${projectA.id.replaceAll("-", "")}`;
        const apiKey = `${keyPrefix}_test`;
        const keyHash = await bcrypt.hash(apiKey, 4);

        await prisma.apiKey.create({
            data: {
                keyPrefix,
                keyHash,
                projectId: projectA.id
            }
        });

        const groupA = await prisma.errorGroup.create({
            data: {
                fingerprint: `trends-isolation-a-${Date.now()}`,
                message: "Project A error",
                name: "Error",
                projectId: projectA.id
            }
        });

        const groupB = await prisma.errorGroup.create({
            data: {
                fingerprint: `trends-isolation-b-${Date.now()}`,
                message: "Project B error",
                name: "Error",
                projectId: projectB.id
            }
        });

        const now = new Date();
        const currentHour = new Date(now);
        currentHour.setUTCMinutes(0, 0, 0);

        await prisma.errorEvent.createMany({
            data: [
                {
                    name: "Error",
                    message: "Project A event",
                    projectId: projectA.id,
                    groupId: groupA.id,
                    timestamp: new Date(currentHour.getTime() + 1000)
                },
                {
                    name: "Error",
                    message: "Project B event",
                    projectId: projectB.id,
                    groupId: groupB.id,
                    timestamp: new Date(currentHour.getTime() + 2000)
                }
            ]
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/dashboard/trends?range=24h",
            headers: {
                "x-api-key": apiKey
            }
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();
        const totalEvents = body.data.reduce(
            (sum: number, bucket: { count: number }) => sum + bucket.count,
            0
        );

        expect(totalEvents).toBe(1);

        await prisma.project.deleteMany({
            where: {
                id: {
                    in: [projectA.id, projectB.id]
                }
            }
        });
    });





});
