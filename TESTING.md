# TESTING

## Quick commands

Run these commands from the `HR_System` root:

```bash
npm run test:backend
npm run test:frontend
npm run test:e2e
npm run test:all
npm run build
npm run verify
npm run verify:e2e
```

## What each command does

- `npm run test:backend`
  Runs the Rust backend test suite with `Cargo.lock` enforced.
  This includes lower-layer unit tests plus router-level smoke and contract integration tests.

- `npm run test:frontend`
  Runs the Vitest frontend suite.
  This includes shared UI primitives, shell/auth, App flow, controller hooks, runtime helpers, utilities, hooks, and glue-layer tests.

- `npm run test:e2e`
  Builds `frontend/dist`, starts the Rust backend on an isolated Playwright SQLite database, then runs desktop and mobile Chromium flows.
  Install the browser once with `npm run playwright:install`.

- `npm run test:all`
  Runs the source line-count check, then backend and frontend tests sequentially.

- `npm run build`
  Builds the Vite frontend and the Rust backend with `Cargo.lock` enforced, matching the Docker build contract.

- `npm run verify`
  Runs the standard full local verification path: `test:all`, then `build`.

- `npm run verify:e2e`
  Runs `verify`, then the Playwright E2E suite.

## Typical local workflow

For quick backend-only verification:

```bash
npm test
```

For full confidence before handoff:

```bash
npm run verify
```

For browser-level confidence, including mobile responsive checks:

```bash
npm run verify:e2e
```

Playwright artifacts are written to `playwright-report/` and `test-results/`; the isolated E2E database lives under `.playwright-data/`.

## Extra local sanity-check

When you want to confirm the generated local SQLite dataset matches the Rust seed code, start the backend once so `backend/hr_system.db` is created, then run:

```bash
sqlite3 backend/hr_system.db "select (select count(*) from users) + (select count(*) from departments) + (select count(*) from positions) + (select count(*) from employees) + (select count(*) from development_goals) + (select count(*) from development_feedback) + (select count(*) from development_meetings) + (select count(*) from onboarding_tasks);"
```

Expected result for the current seeded dataset:

```text
25
```

`backend/hr_system.db` is a local runtime artifact. If this value changes, update the Rust seed data or this documented expectation intentionally rather than committing ad hoc database state.

## Docker and split-origin checks

Docker smoke tests should run with the same persistent data path as production:

```bash
npm run docker:build
npm run docker:run
```

The Docker run scripts mount the named `hr-system-data` volume at `/data`.

Same-origin local development uses the Vite proxy. For split frontend/backend deployments, configure frontend `VITE_API_ORIGIN` and backend `HR_SYSTEM_CORS_ORIGIN` together. If the origins are cross-site, also set `HR_SYSTEM_COOKIE_SECURE=true` and `HR_SYSTEM_COOKIE_SAMESITE=none`, then verify login still sets and sends the session cookie.
