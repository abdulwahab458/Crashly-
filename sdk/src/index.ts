import type { ErrorTrackerConfig } from "./config.js";
import type { ErrorEvent } from "./types.js";

export class ErrorTracker {
  private readonly apiKey: string;

  constructor(config: ErrorTrackerConfig) {
    this.apiKey = config.apiKey;
  }

  captureException(error: Error): ErrorEvent {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }

  init(): void {
    process.on("uncaughtException", (error) => {
      this.captureException(error);
    });
  }
}