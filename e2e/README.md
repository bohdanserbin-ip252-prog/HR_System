# Playwright E2E

The Playwright suite runs against a production-style local app:

- Vite builds `frontend/dist`
- the Rust backend serves that build
- SQLite uses `.playwright-data/hr_system.db`
- the app runs on `http://127.0.0.1:3210` by default

## Commands

```bash
npm run playwright:install
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run verify:e2e
```

## Environment Overrides

- `E2E_PORT` changes the backend port.
- `E2E_DB_PATH` changes the isolated SQLite database path.
- `E2E_FRONTEND_DIST` changes the frontend dist path.
- `PLAYWRIGHT_BASE_URL` points tests at an already reachable app URL.

## Projects

- `desktop-chromium` covers the desktop shell and workflows.
- `mobile-chromium` covers drawer navigation and responsive complaints layout.
