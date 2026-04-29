import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT || '3210';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const dbPath = process.env.E2E_DB_PATH || '.playwright-data/hr_system.db';
const distDir = process.env.E2E_FRONTEND_DIST || 'frontend/dist';
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: 'test-results/playwright',
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL,
    locale: 'uk-UA',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: shouldStartWebServer ? {
    command: `rm -rf .playwright-data && mkdir -p .playwright-data && PORT=${port} HR_SYSTEM_DB_PATH=${dbPath} HR_SYSTEM_FRONTEND_DIST=${distDir} HR_SYSTEM_RATE_LIMIT_DISABLED=true cargo run --manifest-path backend/Cargo.toml --locked`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  } : undefined,
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /mobile-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 5']
      }
    }
  ]
});
