import Fastify from "fastify";
import { registerClerk } from "./plugins/clerk.js";
import { registerCors } from "./plugins/cors.js";
import { registerEventRoutes } from "./modules/events/event.routes.js";
import { registerErrorGroupRoutes, registerErrorGroupStatusRoute } from "./modules/error-groups/error-group.routes.js";
import { registerProjectRoutes } from "./modules/projects/project.routes.js";
import { registerApiKeyRoutes } from "./modules/api-keys/api-key.routes.js";
import { registerDashboardRoutes, registerCurrentUserRoute } from "./modules/dashboard/dashboard.routes.js";
import { registerAllowedOriginRoutes } from "./modules/allowed-origins/allowed-origin.routes.js";

export async function buildApp() {
    const app = Fastify({
        logger: true
    });

    await registerCors(app);
    await registerClerk(app);

    app.get("/health", async () => {
        return {
            status: "ok"
        };
    });

    await registerEventRoutes(app);
    await registerErrorGroupRoutes(app);
    await registerDashboardRoutes(app);
    await registerErrorGroupStatusRoute(app);
    await registerCurrentUserRoute(app);
    await registerProjectRoutes(app);
    await registerApiKeyRoutes(app);
    await registerAllowedOriginRoutes(app);

    return app;
}
