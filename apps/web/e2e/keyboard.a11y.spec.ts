import { test, expect } from '@playwright/test';

/**
 * Keyboard accessibility: a skip-to-content link is the first tab stop and
 * moves focus into the main landmark. Covers the a11y baseline in
 * apps/web/ARCHITECTURE.md without requiring assistive technology.
 */
for (const locale of ['bn', 'en'] as const) {
  test(`skip link moves focus to main content (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/tutors`);
    // First Tab stop must be the skip link (sr-only until focused).
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]').first();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(async () => page.url()).toContain('#main-content');
    const focusedInMain = await page.evaluate(() => {
      const main = document.getElementById('main-content');
      return !!main && (main === document.activeElement || main.contains(document.activeElement));
    });
    expect(focusedInMain).toBe(true);
  });
}
