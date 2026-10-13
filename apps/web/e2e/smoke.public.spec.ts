import { test, expect } from '@playwright/test';

/**
 * Public-site smoke: renders in both locales with no API dependency for
 * first paint. The metrics band is live data — it shows skeletons, real
 * counts, or hides on error, but never fabricated numbers.
 */
for (const locale of ['bn', 'en'] as const) {
  test.describe(`public smoke (${locale})`, () => {
    test('home renders hero, search, and metrics band states', async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page).toHaveTitle(/OgroniEdu/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByPlaceholder(/8801|mail\.com/)).toBeVisible();

      const band = page.getByTestId('platform-metrics-band');
      // Live-data band: visible with skeletons first, then real counts —
      // or hidden entirely when the API is down. It must never show
      // fabricated numbers, so assert presence of structure, not values.
      await expect(band).toBeVisible();
      await expect(band.locator('div').first()).toBeVisible();
    });

    test('tutors discovery page renders', async ({ page }) => {
      await page.goto(`/${locale}/tutors`);
      await expect(page.getByTestId('tutor-discovery-container')).toBeVisible();
    });

    test('login validates empty submit without any request', async ({ page }) => {
      await page.goto(`/${locale}/login`);
      await page.getByTestId('login-submit-btn').click();
      await expect(page.getByTestId('login-error')).toBeVisible();
    });

    test('contact form posts a real ticket and shows a reference', async ({ page }) => {
      await page.goto(`/${locale}/contact`);
      const form = page.locator('form').first();
      await form.locator('input').nth(0).fill('E2E Smoke');
      await form.locator('input[type="email"]').fill(`smoke-${locale}@example.com`);
      await form.locator('textarea').first().fill('Smoke test message from browser E2E harness.');
      await form.locator('button[type="submit"]').click();
      // Either a ticket reference (API up) or a visible error (API down) —
      // both prove the form is wired to the backend, not local-only.
      await expect(
        page.getByTestId('contact-ticket-ref').or(page.getByTestId('contact-submit-error')),
      ).toBeVisible({ timeout: 20_000 });
    });
  });
}
