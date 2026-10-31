import type { ErrorTrackerConfig } from "./config.js";
import type { ErrorEvent } from "./types.js";
import { ConsoleTransport, HttpTransport, type Transport } from "./transport.js";
import type { ErrorRequestHandler } from "express";
import { createExpressErrorHandler } from "./integrations/express.js";
import type { FastifyInstance } from "fastify";
import { registerFastifyErrorHandler } from "./integrations/fastify.js";


export class ErrorTracker {
  private readonly apiKey: string;
  private readonly transport: Transport;

  constructor(config: ErrorTrackerConfig) {
    this.apiKey = config.apiKey;

    this.transport =
      config.transport ??
      (config.endpoint
        ? new HttpTransport(config.endpoint, config.apiKey)
        : new ConsoleTransport());
  }

  captureException(error: Error): ErrorEvent {
    const event: ErrorEvent = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    void this.transport.send(event).catch(() => { });

    return event;
  }

  init(): void {
    process.on("uncaughtException", (error) => {
      this.captureException(error);
    });
    process.on("unhandledRejection", (reason) => {
      const error =
        reason instanceof Error
          ? reason
          : new Error(String(reason));

      this.captureException(error);
    });
  }

  expressErrorHandler(): ErrorRequestHandler {
    return createExpressErrorHandler(this);
  }

  fastify(fastify: FastifyInstance): void {
    registerFastifyErrorHandler(fastify, this);
  }

}