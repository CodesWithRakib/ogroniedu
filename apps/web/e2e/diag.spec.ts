import { test, expect } from '@playwright/test';

test('diagnose stats band', async ({ page }) => {
  const failures: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') failures.push(`console: ${msg.text().slice(0, 200)}`);
  });
  page.on('requestfailed', (req) => {
    failures.push(`reqfail: ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.url().includes('/public/stats')) {
      failures.push(`stats status: ${res.status()}`);
    }
  });
  await page.goto('/bn');
  await page.waitForTimeout(8000);
  const band = await page.getByTestId('platform-metrics-band').count();
  console.log('BAND_COUNT=' + band);
  console.log('FAILURES=' + JSON.stringify(failures));
  expect(band).toBeGreaterThanOrEqual(0);
});
