import { test, expect } from '@playwright/test';

test.describe('SSLCOMMERZ Embedded Easy Checkout & Result Experience E2E', () => {
  test('unauthorized user is redirected to login when accessing checkout', async ({ page }) => {
    await page.goto('/bn/payments');
    await expect(page).toHaveURL(/\/login|\/bn\/login/, { timeout: 15_000 });
  });

  test('unauthorized user is redirected when accessing payment result route', async ({ page }) => {
    await page.goto('/bn/payments/result?orderId=test-order-123');
    await expect(page).toHaveURL(/\/login|\/bn\/login/, { timeout: 15_000 });
  });

  test('public pages and auth shells render cleanly without payment script interference', async ({
    page,
  }) => {
    await page.goto('/bn');
    await expect(page).toHaveTitle(/OgroniEdu|অগ্রণী এডু/i);

    // Verify no unexpected console errors occurred
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/bn/login');
    await expect(page.locator('input[type="email"], input[type="tel"]').first()).toBeVisible();
    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
