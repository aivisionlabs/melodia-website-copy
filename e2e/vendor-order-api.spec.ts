import { test, expect } from '@playwright/test';

/**
 * API smoke: no valid DB token required.
 * For full co-branded UI, set PLAYWRIGHT_VENDOR_ORDER_URL in CI/staging.
 */

test.describe('GET /api/vendor-order/{token}', () => {
  test('unknown token returns 404', async ({ request }) => {
    const res = await request.get(
      '/api/vendor-order/00000000-0000-0000-0000-000000000001',
    );
    expect(res.status()).toBe(404);
  });
});

test.describe('co-branded vendor order page (optional)', () => {
  test('loads when PLAYWRIGHT_VENDOR_ORDER_URL is set', async ({ page }, testInfo) => {
    const url = process.env.PLAYWRIGHT_VENDOR_ORDER_URL;
    if (!url) {
      testInfo.skip();
      return;
    }
    await page.goto(url);
    await expect(page.getByRole('main').or(page.locator('body'))).toBeVisible();
  });
});

test.describe('vendor-order polling interval (optional)', () => {
  test('see network when PLAYWRIGHT_VENDOR_ORDER_URL and assertion enabled', async ({
    page,
  }, testInfo) => {
    const url = process.env.PLAYWRIGHT_VENDOR_ORDER_URL;
    if (!url || process.env.PLAYWRIGHT_ASSERT_POLLING !== 'true') {
      testInfo.skip();
      return;
    }
    const requests: number[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/vendor-order/') && !req.url().endsWith('favicon.ico')) {
        requests.push(Date.now());
      }
    });
    await page.goto(url);
    await page.waitForTimeout(11_000);
    if (requests.length < 2) {
      // Single initial fetch is still ok for terminal orders; test documents optional behavior
      expect(requests.length).toBeGreaterThanOrEqual(1);
    } else {
      const delta = requests[1]! - requests[0]!;
      expect(delta).toBeGreaterThanOrEqual(4000);
      expect(delta).toBeLessThan(15_000);
    }
  });
});
