const { ErrorTracker } = require("sdk");

const tracker = new ErrorTracker({
  apiKey: "etrk_live_a8b4b0a219ac_9c3486dbca3fb2cfd9a891940890aab8cfb7ea12f62b6c7a",
  endpoint: "http://localhost:3001/api/events"
});

tracker.captureException(
  new Error("Crashly SDK integration test")
);

setTimeout(() => {
  console.log("Test event sent.");
}, 1000);