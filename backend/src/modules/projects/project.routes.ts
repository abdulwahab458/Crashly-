import type { FastifyInstance } from "fastify";
import { createProject, listProjects } from "./project.controller.js";

export async function registerProjectRoutes(app: FastifyInstance) {
    app.post<{
        Body: {
            name?: string;
        };
    }>("/api/dashboard/projects", createProject);

    app.get("/api/dashboard/projects", listProjects);

}
