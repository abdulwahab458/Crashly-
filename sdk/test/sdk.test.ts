import { describe, expect, it, vi } from "vitest";
import { ErrorTracker } from "../src/index.js";
import type { ErrorEvent } from "../src/types.js";
import { HttpTransport, type Transport } from "../src/transport.js";

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

  it("sends the error event through the provided transport", async () => {
    let receivedEvent: ErrorEvent | undefined;

    const transport: Transport = {
      send: async (event) => {
        receivedEvent = event;
      }
    };

    const tracker = new ErrorTracker({
      apiKey: "test-api-key",
      transport
    });

    const error = new Error("Database connection failed");

    tracker.captureException(error);

    expect(receivedEvent?.message).toBe("Database connection failed");
    expect(receivedEvent?.name).toBe("Error");
  });

  it("initializes with an endpoint", () => {
    const tracker = new ErrorTracker({
      apiKey: "test-api-key",
      endpoint: "http://localhost:3000/api/events"
    });

    expect(tracker).toBeDefined();
  });

  it("sends an error event through HTTP", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(null, { status: 202 })
  );

  vi.stubGlobal("fetch", fetchMock);

  const transport = new HttpTransport(
    "http://localhost:3000/api/events",
    "test-api-key"
  );

  const event = {
    message: "Database connection failed",
    name: "Error",
    stack: "Error: Database connection failed",
    timestamp: new Date().toISOString()
  };

  await transport.send(event);

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:3000/api/events",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test-api-key"
      },
      body: JSON.stringify(event)
    }
  );

  vi.unstubAllGlobals();
});
});