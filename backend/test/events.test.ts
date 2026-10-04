import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("POST /api/events", () => {
    it("accepts a valid error event", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            headers: {
                "x-api-key": "test-api-key"
            },
            payload: {
                message: "Database connection failed",
                name: "Error",
                stack: "Error: Database connection failed",
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(202);
        expect(response.json()).toEqual({
            status: "accepted"
        });

        await app.close();
    });

    it("rejects an invalid error event", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            payload: {
                hello: "world"
            }
        });

        expect(response.statusCode).toBe(400);

        await app.close();
    });
    it("rejects a request without an API key", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            payload: {
                message: "Database connection failed",
                name: "Error",
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(401);

        await app.close();
    });
    it("rejects a request without an API key", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "POST",
            url: "/api/events",
            payload: {
                message: "Database connection failed",
                name: "Error",
                timestamp: new Date().toISOString()
            }
        });

        expect(response.statusCode).toBe(401);

        await app.close();
    });
});