import type { FastifyInstance } from "fastify";
import { getDashboardSummary, getDashboardTrends, getCurrentUser } from "./dashboard.controller.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
    app.get(
        "/api/dashboard/summary",
        getDashboardSummary
    );

    app.get<{
        Querystring: {
            range?: string;
        };
    }>(
        "/api/dashboard/trends",
        getDashboardTrends
    );
}

export async function registerCurrentUserRoute(app: FastifyInstance) {
    app.get("/api/dashboard/me", getCurrentUser);
}
