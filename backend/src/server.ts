
import { buildApp } from "./app.js";

async function startServer() {
  const app = await buildApp();

  await app.listen({
    port: 3001,
    host: "0.0.0.0"
  });
}

startServer();
