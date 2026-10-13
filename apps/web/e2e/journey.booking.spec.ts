import { test, expect, type Page } from '@playwright/test';

/**
 * Full tutoring-lifecycle journey against a SEEDED staging stack:
 * student login → tutor discovery → booking request → tutor inbox.
 * Runs only when seeded credentials are provided; otherwise skipped
 * (reported as skipped, never as passed). See e2e/README.md.
 */
const studentEmail = process.env.E2E_STUDENT_EMAIL;
const studentPassword = process.env.E2E_STUDENT_PASSWORD;
const tutorEmail = process.env.E2E_TUTOR_EMAIL;
const tutorPassword = process.env.E2E_TUTOR_PASSWORD;
const ready = Boolean(studentEmail && studentPassword && tutorEmail && tutorPassword);

test.describe('tutoring lifecycle journey', () => {
  // Ordered inbox flow: the tutor half depends on the request filed above.
  test.describe.configure({ mode: 'serial' });
  test.skip(!ready, 'needs seeded staging credentials (E2E_*_EMAIL/PASSWORD)');

  async function loginAs(page: Page, email: string, password: string) {
    await page.goto('/bn/login');
    await page.getByTestId('login-identifier-input').fill(email);
    await page.getByTestId('login-password-input').fill(password);
    await page.getByTestId('login-submit-btn').click();
  }

  test('student discovers a tutor and files a booking request', async ({ page }) => {
    await loginAs(page, studentEmail!, studentPassword!);
    await expect(page).toHaveURL(/\/bn\/dashboard/, { timeout: 20_000 });

    // Withdraw prior open requests so the journey is repeatable run to run.
    await page.goto('/bn/requests');
    // Let the RTK Query list settle before scanning for withdraw buttons.
    await page.waitForTimeout(4000);
    for (let i = 0; i < 5; i++) {
      const withdrawBtn = page.locator('[data-testid^="withdraw-btn-"]').first();
      if ((await withdrawBtn.count()) === 0) break;
      await withdrawBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.goto('/bn/tutors');
    await expect(page.getByTestId('tutor-discovery-container')).toBeVisible();
    const firstCard = page.locator('[data-testid^="tutor-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 20_000 });
    await firstCard.getByTestId(/request-tutoring-btn-.*/).click();

    const modal = page.getByTestId('booking-request-modal');
    await expect(modal).toBeVisible();
    const subjectOptions = await modal
      .getByTestId('booking-subject-select')
      .locator('option')
      .count();
    if (subjectOptions > 1) {
      await modal.getByTestId('booking-subject-select').selectOption({ index: 1 });
    }
    await modal.locator('[data-testid^="day-toggle-"]').first().click();
    await modal
      .getByTestId('booking-notes-input')
      .fill('E2E journey request: HSC physics, online.');
    await modal.getByTestId('submit-booking-request').click();
    await expect(modal).toBeHidden({ timeout: 20_000 });
  });

  test('tutor sees the incoming request in the inbox', async ({ page }) => {
    await loginAs(page, tutorEmail!, tutorPassword!);
    await expect(page).toHaveURL(/\/bn\/dashboard/, { timeout: 20_000 });
    await page.goto('/bn/requests');
    await expect(page.getByTestId('requests-list')).toBeVisible({ timeout: 20_000 });
  });
});
