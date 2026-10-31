const Fastify = require("fastify");
const { ErrorTracker } = require("crashly");

const app = Fastify();

const tracker = new ErrorTracker({
  apiKey: "etrk_live_a8b4b0a219ac_9c3486dbca3fb2cfd9a891940890aab8cfb7ea12f62b6c7a",
  endpoint: "http://localhost:3001/api/events"
});

tracker.init();

app.get("/test-error", async (request, reply) => {
  throw new Error("Crashly Fastify integration test");
});

app.get("/ok", async (request, reply) => {
  return { message: "OK" };
});

tracker.fastify(app);

app.listen({ port: 4000 }, (err, address) => {
  if (err) throw err;
  console.log(`Application running at ${address}`);
});