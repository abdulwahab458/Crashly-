import type { FastifyInstance } from "fastify";
import { listErrorGroups, deleteErrorGroup, getErrorGroup, updateErrorGroupStatus } from "./error-group.controller.js";

export async function registerErrorGroupRoutes(app: FastifyInstance) {
    app.get("/api/error-groups", listErrorGroups);

    app.delete<{
        Params: {
            groupId: string;
        };
    }>("/api/error-groups/:groupId", deleteErrorGroup);


    app.get<{
        Params: { groupId: string };
        Querystring: { page?: string; limit?: string };
    }>(
        "/api/error-groups/:groupId",
        getErrorGroup
    );

}

export async function registerErrorGroupStatusRoute(app: FastifyInstance) {
    app.patch<{
        Params: { groupId: string };
        Body: { status: "UNRESOLVED" | "RESOLVED" };
    }>(
        "/api/error-groups/:groupId/status",
        updateErrorGroupStatus
    );
}
