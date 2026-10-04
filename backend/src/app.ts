import Fastify from "fastify";
import type { ErrorEvent } from "./types.js";
import { isValidApiKey } from "./auth.js";

export function buildApp() {
    const app = Fastify({
        logger: true
    });

    app.get("/health", async () => {
        return {
            status: "ok"
        };
    });

    app.post<{ Body: ErrorEvent }>(
        "/api/events",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["message", "name", "timestamp"],
                    properties: {
                        message: { type: "string" },
                        name: { type: "string" },
                        stack: { type: "string" },
                        timestamp: { type: "string" }
                    },
                    additionalProperties: false
                }
            }
        },
        async (request, reply) => {
            const apiKey = request.headers["x-api-key"];

            if (!isValidApiKey(apiKey)) {
                return reply.code(401).send({
                    status: "unauthorized"
                });
            }
            const event = request.body;

            console.log("Received error event:", event);

            return reply.code(202).send({
                status: "accepted"
            });
        }
    );

    return app;
}