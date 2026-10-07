import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/utils/db.js";
import bcrypt from "bcrypt";

describe("GET /api/events", () => {
    it("rejects an API key with a valid prefix but invalid secret", async () => {
    const app = buildApp();

    const project = await prisma.project.create({
        data: {
            name: "Invalid Secret Project"
        }
    });

    const validApiKey = "etrk_test_security_123456789";
    const keyPrefix = validApiKey.slice(0, 14);
    const keyHash = await bcrypt.hash(validApiKey, 12);

    await prisma.apiKey.create({
        data: {
            keyPrefix,
            keyHash,
            projectId: project.id
        }
    });

    const invalidApiKey = `${keyPrefix}wrong-secret`;

    const response = await app.inject({
        method: "GET",
        url: "/api/events",
        headers: {
            "x-api-key": invalidApiKey
        }
    });

    expect(response.statusCode).toBe(401);

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