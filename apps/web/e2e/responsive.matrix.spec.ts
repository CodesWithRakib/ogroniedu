import { test, expect } from '@playwright/test';

/**
 * Responsive matrix: key routes must render without horizontal overflow at
 * small mobile (360), standard mobile (390), tablet (768), desktop (1280),
 * and large desktop (1440). Uses safe-area-aware mobile nav where present.
 */
const viewports = [
  { width: 360, height: 800, label: 'small-mobile' },
  { width: 390, height: 844, label: 'standard-mobile' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 1280, height: 800, label: 'desktop' },
  { width: 1440, height: 900, label: 'large-desktop' },
] as const;

const routes = ['/bn', '/bn/tutors', '/bn/login', '/bn/pricing'] as const;

for (const vp of viewports) {
  test.describe(`viewport ${vp.label} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of routes) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement || document.documentElement;
          return el.scrollWidth - document.documentElement.clientWidth;
        });
        expect(
          overflow,
          `${route} overflows by ${overflow}px at ${vp.width}px`,
        ).toBeLessThanOrEqual(1);
      });
    }
  });
}
