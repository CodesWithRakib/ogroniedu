import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Admin console journey against a live stack (serial, browser-visible
 * assertions only; API calls below are test SETUP, never assertions):
 * admin login → verification queue approve → user suspend/reactivate.
 * Skipped without E2E_ADMIN_EMAIL/PASSWORD (reported as skipped).
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const ready = Boolean(adminEmail && adminPassword);
const API = process.env.E2E_API_URL || 'http://localhost:4000';

test.describe('admin console journey', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!ready, 'needs admin staging credentials (E2E_ADMIN_EMAIL/PASSWORD)');

  const stamp = Date.now();
  const studentEmail = `e2e-disposable-${stamp}@ogroni.test`;
  const tutorEmail = `e2e-tutor-${stamp}@ogroni.test`;
  const tutorName = `E2E Tutor ${stamp}`;
  let tutorId = '';

  async function api(
    request: APIRequestContext,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    path: string,
    token?: string,
    body?: unknown,
  ) {
    const res = await request.fetch(`${API}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      data: body,
    });
    if (!res.ok()) {
      throw new Error(`setup ${method} ${path} failed: ${res.status()} ${await res.text()}`);
    }
    return res.json();
  }

  async function register(
    request: APIRequestContext,
    displayName: string,
    email: string,
    role: string,
  ) {
    const res = await api(request, 'POST', '/api/v1/auth/register', undefined, {
      displayName,
      email,
      password: 'TestPass123',
      role,
      preferredLocale: 'en',
    });
    return res as { user: { id: string }; accessToken: string };
  }

  /** 1x1 PNG used as private dossier evidence. */
  const EVIDENCE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  async function uploadEvidence(
    request: APIRequestContext,
    token: string,
    filename: string,
  ): Promise<string> {
    const res = (await api(request, 'POST', '/api/v1/files/upload-evidence', token, {
      purpose: 'tutor_verification_evidence',
      originalFilename: filename,
      mediaType: 'image/png',
      sizeBytes: Buffer.from(EVIDENCE_PNG_BASE64, 'base64').length,
      contentBase64: EVIDENCE_PNG_BASE64,
    })) as { file: { id: string } };
    return res.file.id;
  }

  test.beforeAll(async ({ request }) => {
    // Disposable student for the suspend/reactivate loop.
    await register(request, `E2E Disposable ${stamp}`, studentEmail, 'student');
    // Disposable tutor driven into the identity verification queue.
    const tutor = await register(request, tutorName, tutorEmail, 'tutor');
    tutorId = tutor.user.id;
    const th = tutor.accessToken;
    const subjects = (await api(request, 'GET', '/api/v1/taxonomy/subjects', th)).data;
    const levels = (await api(request, 'GET', '/api/v1/taxonomy/education-levels', th)).data;
    await api(request, 'PUT', '/api/v1/tutors/me/profile', th, {
      teachingModes: ['online'],
      hourlyRateMinor: 80000,
      headline: 'E2E verification probe',
    });
    await api(request, 'POST', '/api/v1/tutors/me/subjects', th, {
      subjectId: subjects[0].id,
      educationLevelId: levels[0].id,
      rateMinor: 80000,
    });
    // Identity level needs both NID sides uploaded, then submitted for review.
    for (const documentType of ['nid_front', 'nid_back'] as const) {
      const fileAssetId = await uploadEvidence(request, th, `${documentType}.png`);
      await api(request, 'POST', '/api/v1/tutors/me/verification/documents', th, {
        level: 'identity',
        documentType,
        fileAssetId,
      });
    }
    await api(request, 'POST', '/api/v1/tutors/me/verification/levels/identity/submit', th, {});
  });

  async function loginAsAdmin(page: Page) {
    await page.goto('/bn/login');
    await page.getByTestId('login-identifier-input').fill(adminEmail!);
    await page.getByTestId('login-password-input').fill(adminPassword!);
    await page.getByTestId('login-submit-btn').click();
    await expect(page).toHaveURL(/\/bn\/admin/, { timeout: 20_000 });
    await expect(page.getByTestId('admin-dashboard-view')).toBeVisible({ timeout: 20_000 });
  }

  test('admin reviews the dossier evidence and approves the identity level', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId('tab-verification').click();
    await expect(page.getByTestId('verification-tab-content')).toBeVisible();
    await page.getByTestId('verification-search-input').fill(tutorName);

    // One queue row per level awaiting a decision.
    const row = page.getByTestId(`verification-row-${tutorId}-identity`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await page.getByTestId(`review-tutor-btn-${tutorId}-identity`).click();

    const modal = page.getByTestId('verification-dossier-modal');
    await expect(modal).toBeVisible();

    // Approve both uploaded NID sides through the reviewer-scoped documents API.
    const identityLevel = modal.getByTestId('dossier-level-identity');
    const documentRows = identityLevel.locator('[data-testid^="dossier-document-"]');
    await expect(documentRows).toHaveCount(2);
    const approveButtons = identityLevel.locator('[data-testid^="approve-doc-btn-"]');
    await expect(approveButtons).toHaveCount(2);
    const approvedBadges = identityLevel
      .locator('[data-testid^="doc-status-"]')
      .filter({ hasText: /অনুমোদিত|Approved/ });
    for (let index = 0; index < 2; index += 1) {
      await approveButtons.nth(index).click();
      await expect(approvedBadges).toHaveCount(index + 1, { timeout: 20_000 });
    }

    // The level can only be approved once every mandatory document is approved.
    await modal.getByTestId('select-level-identity').click();
    await modal.getByTestId('verification-decision-select').selectOption('approved');
    await modal.getByTestId('verification-reason-input').fill('e2e-docs-verified');
    await modal.getByTestId('verification-feedback-input').fill('Identity documents verified.');
    await modal.getByTestId('verification-confirm-btn').click();

    // The decided level shows its new status in the open dossier...
    await expect(modal.getByTestId('dossier-level-status-identity')).toHaveText(
      /অনুমোদিত|Approved/,
      { timeout: 20_000 },
    );
    // ...and the case leaves the submitted queue.
    await modal.getByRole('button', { name: /বন্ধ করুন|Close/ }).click();
    await expect(modal).toBeHidden();
    await page.getByTestId('verification-search-input').fill(tutorName);
    await expect(row).toBeHidden({ timeout: 20_000 });
  });

  test('admin suspends and reactivates the disposable student', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByTestId('tab-users').click();
    await expect(page.getByTestId('users-tab-content')).toBeVisible();
    await page.getByTestId('users-search-input').fill(studentEmail);
    const suspendBtn = page.locator('[data-testid^="suspend-user-btn-"]').first();
    await expect(suspendBtn).toBeVisible({ timeout: 20_000 });
    await suspendBtn.click();
    const modal = page.getByTestId('suspend-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('suspend-reason-textarea').fill('E2E probe: disposable account');
    await modal.getByTestId('confirm-suspend-btn').click();
    await expect(modal).toBeHidden({ timeout: 20_000 });
    const reactivateBtn = page.locator('[data-testid^="reactivate-user-btn-"]').first();
    await expect(reactivateBtn).toBeVisible({ timeout: 20_000 });
    await reactivateBtn.click();
    await expect(page.locator('[data-testid^="suspend-user-btn-"]').first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
