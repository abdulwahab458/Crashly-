import type { FastifyInstance } from "fastify";
import type { ErrorTracker } from "../index.js";

export function registerFastifyErrorHandler(
  fastify: FastifyInstance,
  tracker: ErrorTracker
): void {
  fastify.addHook("onError", (request, reply, error, done) => {
    tracker.captureException(error);
    done();
  });
}