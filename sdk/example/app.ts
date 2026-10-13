import { ErrorTracker } from "../src/index.js";

const tracker = new ErrorTracker({
    apiKey: "etrk_live_0e2161ee98ac8bd28b7cb1a22302ee8a2dbfe2ca7b89995b81e8315306219f06",
    endpoint: "http://localhost:3000/api/events"
});

tracker.captureException(
    new Error("Real SDK to backend test")
);
