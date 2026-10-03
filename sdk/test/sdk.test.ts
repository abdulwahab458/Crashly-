import { describe, expect, it, vi } from "vitest";
import { ErrorTracker } from "../src/index.js";

describe("ErrorTracker", () => {
  it("initializes with an API key", () => {
    const tracker = new ErrorTracker({
      apiKey: "test-api-key"
    });

    expect(tracker).toBeDefined();
  });

  it("captures an exception", () => {
    const tracker = new ErrorTracker({
      apiKey: "test-api-key"
    });

    const error = new Error("Database connection failed");

    const event = tracker.captureException(error);

    expect(event.message).toBe("Database connection failed");
    expect(event.name).toBe("Error");
    expect(event.stack).toBe(error.stack);
    expect(event.timestamp).toEqual(expect.any(String));
  });

  it("captures an uncaught exception", () => {
  const tracker = new ErrorTracker({
    apiKey: "test-api-key"
  });

  const captureSpy = vi.spyOn(tracker, "captureException");

  tracker.init();

  const error = new Error("Unexpected crash");

  process.emit("uncaughtException", error);

  expect(captureSpy).toHaveBeenCalledWith(error);

  captureSpy.mockRestore();
});
});