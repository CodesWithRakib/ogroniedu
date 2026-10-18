import { test, expect, type Page } from '@playwright/test';
import { loginViaUi } from './support/login';

/**
 * Phase 21 remainder, verified in a real browser against seeded dev data:
 * 1. Tutor uploads credential evidence (file → /files/upload-evidence →
 *    qualification linked with evidenceAssetId), no mock uploads.
 * 2. Any user can revoke all sessions from /profile (real API), ending
 *    in a signed-out state that the route guard redirects to login.
 */
const tutorEmail = process.env.E2E_TUTOR_EMAIL;
const tutorPassword = process.env.E2E_TUTOR_PASSWORD;
const studentEmail = process.env.E2E_STUDENT_EMAIL;
const studentPassword = process.env.E2E_STUDENT_PASSWORD;
const ready = Boolean(tutorEmail && tutorPassword && studentEmail && studentPassword);

test.describe('evidence upload + session revocation', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });
  test.skip(!ready, 'needs seeded staging credentials (E2E_*_EMAIL/PASSWORD)');

  async function loginAs(page: Page, email: string, password: string) {
    await loginViaUi(page, email, password, /\/bn\/dashboard/);
  }

  test('tutor uploads NID evidence and links a qualification', async ({ page }) => {
    await loginAs(page, tutorEmail!, tutorPassword!);
    await expect(page).toHaveURL(/\/bn\/dashboard/, { timeout: 20_000 });

    await page.goto('/bn/dashboard/tutor');
    const form = page.getByTestId('qualification-upload-form');
    await expect(form).toBeVisible({ timeout: 20_000 });
    await form.getByTestId('qualification-type-select').selectOption('nid');
    await form.getByTestId('qualification-title-input').fill(`E2E NID ${Date.now()}`);
    await form.getByTestId('qualification-file-input').setInputFiles({
      name: 'nid-evidence.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await form.getByTestId('qualification-upload-btn').click();
    await expect(form.getByTestId('qualification-upload-saved')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('student revokes all sessions and lands signed out', async ({ page }) => {
    await loginAs(page, studentEmail!, studentPassword!);
    await expect(page).toHaveURL(/\/bn\/dashboard/, { timeout: 20_000 });

    await page.goto('/bn/profile');
    await expect(page.getByTestId('profile-form')).toBeVisible({ timeout: 20_000 });
    // Security controls live on a dedicated tab since the profile page refactor.
    await page
      .getByRole('button', { name: /সেশন ও নিরাপত্তা|Security & Sessions/ })
      .click();
    await page.getByTestId('revoke-all-btn').click();
    await page.getByTestId('revoke-all-confirm-btn').click();
    // Immediate local logout + redirect with confirmation notice on login.
    await expect(page).toHaveURL(/\/bn\/login/, { timeout: 20_000 });
    await expect(page.getByTestId('login-notice')).toBeVisible();
    await expect(page.getByTestId('login-form')).toBeVisible();
  });
});
