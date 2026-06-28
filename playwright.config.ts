import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests (co-branded vendor order + API smoke).
 *
 * - Default base URL: http://127.0.0.1:3000 — override with PLAYWRIGHT_BASE_URL.
 * - Full page tests: set PLAYWRIGHT_VENDOR_ORDER_URL to a real order URL.
 * - Polling cadence check: set PLAYWRIGHT_ASSERT_POLLING=true (needs a transient order).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
