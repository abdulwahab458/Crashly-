# Crashly

Crashly is a developer error-monitoring application for collecting, grouping, and inspecting application errors. It includes:

- A Fastify API backed by PostgreSQL and Prisma
- A Clerk-authenticated Next.js dashboard
- A TypeScript SDK for Node.js, Express, Fastify, and browser applications
- Project-scoped API keys and browser-origin allowlists
- Automated error fingerprinting, grouping, trends, and issue workflows

## Features

### Error collection

- Capture handled errors with `captureException(error)`.
- Automatically capture Node.js `uncaughtException` and `unhandledRejection` events.
- Automatically capture browser `error` and `unhandledrejection` events.
- Send events to the Crashly API using the `X-API-Key` header.
- Use a custom SDK transport or the built-in console transport.
- Store error name, message, stack trace, timestamp, project, and group metadata.

### Error grouping

- Generate a deterministic fingerprint from the project and error details.
- Group repeated occurrences of the same error.
- Track occurrence count, first seen time, and last seen time.
- Automatically reopen a group when a new event arrives.
- Keep individual events available under their error group.

### Dashboard

- Sign up, sign in, and sign out with Clerk.
- Create and switch between projects.
- Persist the selected project in browser local storage.
- View total error groups, total events, and errors from the last 24 hours.
- View error-volume trends for the last 24 hours or 7 days.
- View recent issues from the project overview.
- Refresh dashboard metrics manually.
- Use a responsive dark-themed interface with mobile navigation.

### Issue management

- List fingerprinted error groups.
- Search by error name or message.
- Filter by `UNRESOLVED`, `RESOLVED`, or all statuses.
- Paginate through issue groups.
- Resolve or reopen issues directly from the list.
- Open an issue detail page.
- Inspect occurrence metadata and paginated event history.
- Expand and collapse stack traces.
- Resolve, reopen, or permanently delete an error group.

### API key and origin management

- Create project-scoped ingest keys with the `etrk_live_` prefix.
- Display a newly created secret once so it can be copied securely.
- Store only bcrypt hashes of API key secrets.
- List key prefixes and key status without exposing secrets again.
- Revoke keys immediately.
- Register allowed browser origins per project.
- Normalize and validate origins as `http` or `https` origins without paths, queries, or fragments.
- Remove allowed origins.
- Enforce project ownership for dashboard operations.

## Repository structure

```text
backend/       Fastify API, Prisma schema, migrations, and backend tests
frontend/      Next.js dashboard and Clerk authentication UI
sdk/           TypeScript Crashly SDK and framework integrations
crashly-test/  Local SDK integration and browser test applications
```

## Architecture

```text
Application
   |
   | Crashly SDK / X-API-Key
   v
Fastify API (:3001)
   |
   | Prisma
   v
PostgreSQL

Next.js dashboard (:3000)
   |
   | Clerk bearer token
   v
Fastify API
```

The event ingestion path authenticates the API key, checks the request origin when one is present, fingerprints the event, upserts its error group, and stores the event. Dashboard requests authenticate through Clerk and are scoped to projects owned by the signed-in user.

## Requirements

- Node.js with npm
- PostgreSQL
- Clerk application credentials

The repository currently uses:

- Next.js 16 and React 19
- Fastify 5
- Prisma 7
- PostgreSQL
- TypeScript
- Vitest

## Configuration

Create environment files appropriate for your local setup. Do not commit secrets.

### Backend

The backend reads:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by the application |
| `DIRECT_URL` | PostgreSQL connection string used by Prisma configuration/migrations |
| `FRONTEND_URL` | Dashboard origin allowed by CORS |
| Clerk server variables | Clerk credentials required by `@clerk/fastify` |

`FRONTEND_URL` should normally be `http://localhost:3000` during local development.

### Frontend

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL; defaults to `http://localhost:3001/api` |
| Clerk browser variables | Clerk publishable key and related Next.js configuration |

The frontend API client uses Clerk bearer tokens for dashboard requests.

## Local development

Install dependencies in each package:

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../sdk
npm install
```

Prepare the database:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Start the backend:

```bash
cd backend
npm run dev
```

The API listens on `http://localhost:3001`.

Start the dashboard in another terminal:

```bash
cd frontend
npm run dev
```

The dashboard is available at `http://localhost:3000`.

## SDK usage

Build the SDK:

```bash
cd sdk
npm run build
```

### Node.js

```ts
import { ErrorTracker } from "crashly";

const tracker = new ErrorTracker({
  apiKey: process.env.CRASHLY_API_KEY!,
  endpoint: "http://localhost:3001/api/events",
});

tracker.init();

try {
  // Application logic
} catch (error) {
  tracker.captureException(error as Error);
}
```

### Express

```ts
import express from "express";
import { ErrorTracker } from "crashly";

const app = express();
const tracker = new ErrorTracker({
  apiKey: process.env.CRASHLY_API_KEY!,
  endpoint: "http://localhost:3001/api/events",
});

tracker.init();

// Register after application routes.
app.use(tracker.expressErrorHandler());
```

The Express integration captures the error and passes it to the next error handler.

### Fastify

```ts
import Fastify from "fastify";
import { ErrorTracker } from "crashly";

const app = Fastify();
const tracker = new ErrorTracker({
  apiKey: process.env.CRASHLY_API_KEY!,
  endpoint: "http://localhost:3001/api/events",
});

tracker.init();
tracker.fastify(app);
```

### Browser

```ts
import { BrowserErrorTracker } from "crashly/browser";

const tracker = new BrowserErrorTracker({
  apiKey: "etrk_live_your_key",
  endpoint: "http://localhost:3001/api/events",
});

tracker.init();
```

For browser ingestion, add the exact application origin (for example `http://localhost:5173`) to the project's **Allowed Origins** list.

## Event format

The event ingestion endpoint accepts:

```json
{
  "message": "Database connection failed",
  "name": "Error",
  "stack": "Error: Database connection failed\n    at ...",
  "timestamp": "2026-11-03T08:38:00.000Z"
}
```

`message`, `name`, and `timestamp` are required. `stack` is optional. A successful ingestion returns HTTP `202`.

## API reference

Base URL: `http://localhost:3001/api`

### Health and ingestion

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `POST` | `/events` | `X-API-Key` | Ingest an error event |
| `GET` | `/events` | `X-API-Key` | List events for the API-key project |

### Dashboard and projects

Dashboard endpoints use a Clerk bearer token and a project selected through the `projectId` query parameter or `X-Project-Id` header where required.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/dashboard/me` | Return the current Clerk user ID |
| `GET` | `/dashboard/summary` | Return group, event, and 24-hour counts |
| `GET` | `/dashboard/trends?range=24h\|7d` | Return hourly or daily event buckets |
| `GET` | `/dashboard/projects` | List projects owned by the current user |
| `POST` | `/dashboard/projects` | Create a project |

### Error groups

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/error-groups` | Search, filter, and paginate groups |
| `GET` | `/error-groups/:groupId` | Get a group and paginated events |
| `PATCH` | `/error-groups/:groupId/status` | Resolve or reopen a group |
| `DELETE` | `/error-groups/:groupId` | Delete a group and its events |

Issue-list query parameters include `projectId`, `page`, `limit`, `search`, and `status`.

### API keys

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/dashboard/projects/:projectId/api-keys` | Create an ingest key |
| `GET` | `/dashboard/projects/:projectId/api-keys` | List key prefixes and statuses |
| `DELETE` | `/dashboard/projects/:projectId/api-keys/:keyId` | Revoke a key |

The raw secret is returned only by the create operation. Save it immediately.

### Allowed origins

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/dashboard/projects/:projectId/origins` | Add a browser origin |
| `GET` | `/dashboard/projects/:projectId/origins` | List project origins |
| `DELETE` | `/dashboard/projects/:projectId/origins/:originId` | Remove an origin |

## Database model

Prisma manages the following entities:

- `Project`: project ownership and relationships
- `ApiKey`: hashed ingest credentials and revocation state
- `ErrorEvent`: individual captured errors
- `ErrorGroup`: fingerprinted aggregate issue state
- `AllowedOrigin`: browser origins permitted to ingest events

Deleting a project cascades to its API keys, events, groups, and allowed origins. Deleting an error group cascades to its events.

## Tests and checks

Run backend tests:

```bash
cd backend
npm test
```

Build the backend:

```bash
cd backend
npm run build
```

Run frontend linting and build:

```bash
cd frontend
npm run lint
npm run build
```

Run SDK tests:

```bash
cd sdk
npm test
```

The `crashly-test` package and `crashly-test/crashly-browser-test` application provide local integration examples for Fastify and browser capture flows.

## Security notes

- Keep API key secrets out of source control and environment logs.
- API keys are project-scoped and stored as bcrypt hashes.
- Revoke compromised keys from the dashboard immediately.
- Configure only trusted browser origins.
- Use HTTPS for deployed SDK endpoints and dashboard traffic.
- Replace any sample or previously exposed local-development credentials before using the repository outside a private test environment.

## Current limitations

- The backend server currently listens on port `3001` in `src/server.ts`.
- The dashboard trend ranges are limited to `24h` and `7d`.
- SDK transport failures are intentionally swallowed so error reporting does not crash the host application.
- The SDK event schema currently contains message, name, optional stack, and timestamp; richer context fields are not yet modeled.

## License

The package manifests currently declare the ISC license. Confirm the intended project license before publishing or distributing Crashly.
