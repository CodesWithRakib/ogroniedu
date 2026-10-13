import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E harness (Phase 22 H-2/H-4).
 * Runs against a live staging stack (see e2e/README.md): web baseURL +
 * API + seeded Postgres. No servers are started here; CI composes them
 * (see .github/workflows/e2e.yml).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    locale: 'bn-BD',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
