import { test, expect } from '@playwright/test';

/**
 * Auth boundaries: unauthenticated direct-URL access must land on login
 * (client guard), never on protected content. Server-side APIs enforce the
 * real authorization; these specs pin the redirect behavior.
 */
for (const locale of ['bn', 'en'] as const) {
  test.describe(`auth guards (${locale})`, () => {
    test('dashboard router redirects to login when unauthenticated', async ({ page }) => {
      await page.goto(`/${locale}/dashboard`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
      await expect(page.getByTestId('login-form')).toBeVisible();
    });

    test('role dashboards redirect to login when unauthenticated', async ({ page }) => {
      await page.goto(`/${locale}/dashboard/tutor`);
      await expect(page.getByTestId('login-form')).toBeVisible();
    });

    test('admin console redirects to login when unauthenticated', async ({ page }) => {
      await page.goto(`/${locale}/admin`);
      await expect(page.getByTestId('login-form')).toBeVisible();
    });

    test('login rejects bad credentials with a visible error', async ({ page }) => {
      await page.goto(`/${locale}/login`);
      await page.getByTestId('login-identifier-input').fill('nobody@example.com');
      await page.getByTestId('login-password-input').fill('wrong-password-123');
      await page.getByTestId('login-submit-btn').click();
      await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 20_000 });
    });
  });
}
