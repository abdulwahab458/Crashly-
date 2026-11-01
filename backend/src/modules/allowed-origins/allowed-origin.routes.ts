import type { FastifyInstance } from "fastify";

import {
    addAllowedOrigin,
    listAllowedOrigins,
    deleteAllowedOrigin
} from "./allowed-origin.controller.js";

export async function registerAllowedOriginRoutes(app: FastifyInstance) {
    app.post<{
        Params: { projectId: string };
        Body: { origin?: string };
    }>("/api/dashboard/projects/:projectId/origins", addAllowedOrigin);

    app.get<{
        Params: { projectId: string };
    }>("/api/dashboard/projects/:projectId/origins", listAllowedOrigins);

    app.delete<{
        Params: {
            projectId: string;
            originId: string;
        };
    }>("/api/dashboard/projects/:projectId/origins/:originId", deleteAllowedOrigin);
}