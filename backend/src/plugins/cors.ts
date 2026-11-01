import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { prisma } from "../utils/db.js";

const dashboardOrigin = process.env.FRONTEND_URL;

export async function registerCors(app: FastifyInstance) {
    await app.register(cors, {
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, false);
            }

            if (origin === dashboardOrigin) {
                return callback(null, true);
            }

            prisma.allowedOrigin.findFirst({
                where: {
                    origin
                },
                select: {
                    id: true
                }
            }).then((allowedOrigin) => {
                callback(null, Boolean(allowedOrigin));
            }).catch(() => {
                callback(new Error("Origin validation failed"), false);
            });
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-API-Key"
        ]
    });
}