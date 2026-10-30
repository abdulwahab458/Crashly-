const { ErrorTracker } = require("sdk");

const tracker = new ErrorTracker({
  apiKey: "etrk_live_a8b4b0a219ac_9c3486dbca3fb2cfd9a891940890aab8cfb7ea12f62b6c7a",
  endpoint: "http://localhost:3001/api/events"
});

tracker.init();

async function fetchUser() {
  const response = await fetch("http://localhost:9999/api/users");

  return response.json();
}

console.log("Application started");

fetchUser();