import type { FastifyInstance } from "fastify";
import { ingestEvent, listEvents } from "./event.controller.js";

export async function registerEventRoutes(app: FastifyInstance) {
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
        ingestEvent
    );
    app.get("/api/events", listEvents);
}
