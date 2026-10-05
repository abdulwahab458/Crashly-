import { ErrorTracker } from "../src/index.js";

const tracker = new ErrorTracker({
  apiKey: "test-api-key",
  endpoint: "http://localhost:3000/api/events"
});

const error = new Error("Database connection failed");

tracker.captureException(error);