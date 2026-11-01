import type { FastifyInstance } from "fastify";
import { createApiKey, listApiKeys, revokeApiKey } from "./api-key.controller.js";

export async function registerApiKeyRoutes(app: FastifyInstance) {
    app.post<{
        Params: {
            projectId: string;
        };
    }>("/api/dashboard/projects/:projectId/api-keys", createApiKey);
    app.get<{
        Params: {
            projectId: string;
        };
    }>("/api/dashboard/projects/:projectId/api-keys", listApiKeys);
    app.delete<{
        Params: {
            projectId: string;
            keyId: string;
        };
    }>(
        "/api/dashboard/projects/:projectId/api-keys/:keyId",
        revokeApiKey
    );

}
