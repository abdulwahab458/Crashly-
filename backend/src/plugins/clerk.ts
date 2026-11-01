import "dotenv/config";
import type { FastifyInstance } from "fastify";
import { clerkPlugin } from "@clerk/fastify";

export async function registerClerk(app: FastifyInstance) {
    await app.register(clerkPlugin);
}
