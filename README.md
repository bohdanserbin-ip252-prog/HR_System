# HR System

HR System is a split frontend/backend project:

- frontend: Vite + React
- backend: Rust (`axum` + `rusqlite`)
- database: SQLite

## Local development

Install dependencies from the project root:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev
```

## Test matrix

Use the root scripts depending on which layer you want to verify:

```bash
npm test
npm run test:backend
npm run test:frontend
npm run test:all
npm run build
```

What they do:

- `npm test` and `npm run test:backend` run the Rust backend suite
- `npm run test:frontend` runs the Vitest frontend suite
- `npm run test:all` runs backend and frontend tests sequentially
- `npm run build` builds the Vite frontend and the Rust backend

For the fuller testing guide and the standard pre-handoff flow, see [TESTING.md](./TESTING.md).

Coverage at a glance:

- backend: lower-layer unit tests plus router-level smoke and contract integration tests
- frontend: shared UI primitives, shell/auth, App flow, controller hooks, runtime helpers, utilities, and glue-layer tests

## Start production-style backend

Run the Rust backend in release mode from the project root:

```bash
npm run start
```

If `frontend/dist` exists, the backend serves the built frontend automatically.

## Environment

The Rust backend supports these runtime environment variables:

- `PORT` — backend HTTP port, default `3000`
- `HR_SYSTEM_DB_PATH` — path to the SQLite database file
- `HR_SYSTEM_FRONTEND_DIST` — path to built frontend assets

If these are not set, the backend tries sensible runtime-relative defaults such as:

- `backend/hr_system.db`
- `frontend/dist`

## Docker

Prepare local artifacts and build the container:

```bash
npm run docker:build
```

Run it:

```bash
npm run docker:run
```

The image includes:

- the compiled Rust backend
- the built Vite frontend
- the seeded SQLite database file

Notes:

- the current `Dockerfile` packages locally built artifacts, so it does not depend on npm/crates network access during `docker build`
- if your Docker environment has restricted bridge networking, use Linux host networking instead:

```bash
npm run docker:run:host
```
