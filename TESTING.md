# TESTING

## Quick commands

Run these commands from the `HR_System` root:

```bash
npm run test:backend
npm run test:frontend
npm run test:all
npm run build
npm run verify
```

## What each command does

- `npm run test:backend`
  Runs the Rust backend test suite.
  This includes lower-layer unit tests plus router-level smoke and contract integration tests.

- `npm run test:frontend`
  Runs the Vitest frontend suite.
  This includes shared UI primitives, shell/auth, App flow, controller hooks, runtime helpers, utilities, hooks, and glue-layer tests.

- `npm run test:all`
  Runs backend and frontend tests sequentially.

- `npm run build`
  Builds the Vite frontend and the Rust backend.

- `npm run verify`
  Runs the standard full local verification path: `test:all` and then `build`.

## Typical local workflow

For quick backend-only verification:

```bash
npm test
```

For full confidence before handoff:

```bash
npm run verify
```

## Extra local sanity-check

When you want to confirm the seeded SQLite dataset has not drifted, run:

```bash
sqlite3 backend/hr_system.db "select (select count(*) from users) + (select count(*) from departments) + (select count(*) from positions) + (select count(*) from employees) + (select count(*) from development_goals) + (select count(*) from development_feedback) + (select count(*) from development_meetings) + (select count(*) from onboarding_tasks);"
```

Expected result for the current seeded dataset:

```text
25
```
