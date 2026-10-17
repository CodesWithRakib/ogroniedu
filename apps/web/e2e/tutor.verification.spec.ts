import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { loginViaUi, postLoginWithRateLimitRetry } from './support/login';

/**
 * Tutor verification dossier journey against a live stack.
 *
 * The three-level page is asserted to reflect the API, not a mock: the spec
 * logs in through the public API to read the *expected* per-level statuses, then
 * verifies each rendered level card shows exactly those statuses (and that the
 * page renders no error state).
 *
 * Skipped without E2E_TUTOR_EMAIL/PASSWORD (reported as skipped).
 */
const tutorEmail = process.env.E2E_TUTOR_EMAIL;
const tutorPassword = process.env.E2E_TUTOR_PASSWORD;
const ready = Boolean(tutorEmail && tutorPassword);
const API = process.env.E2E_API_URL || 'http://localhost:4000';

const LEVELS = ['identity', 'educational', 'institutional'] as const;
const STATUS_LABELS: Record<string, { bn: string; en: string }> = {
  not_started: { bn: 'শুরু হয়নি', en: 'Not started' },
  draft: { bn: 'খসড়া', en: 'Draft' },
  submitted: { bn: 'জমা দেওয়া হয়েছে', en: 'Submitted' },
  under_review: { bn: 'পর্যালোচনাধীন', en: 'Under review' },
  needs_information: { bn: 'তথ্য প্রয়োজন', en: 'Information needed' },
  approved: { bn: 'অনুমোদিত', en: 'Approved' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
  suspended: { bn: 'স্থগিত', en: 'Suspended' },
  expired: { bn: 'মেয়াদোত্তীর্ণ', en: 'Expired' },
};

test.describe('tutor verification dossier', () => {
  // Enough headroom for the login helper to wait out a rate-limit window.
  test.describe.configure({ timeout: 120_000 });
  test.skip(!ready, 'needs seeded tutor credentials (E2E_TUTOR_EMAIL/PASSWORD)');

  async function loginAsTutor(page: Page) {
    await loginViaUi(page, tutorEmail!, tutorPassword!, /\/bn\/dashboard/);
  }

  async function apiDossierLevels(request: APIRequestContext): Promise<Record<string, string>> {
    const login = await postLoginWithRateLimitRetry(request, API, {
      identifier: tutorEmail!,
      password: tutorPassword!,
    });
    expect(login.ok()).toBeTruthy();
    const { accessToken } = (await login.json()) as { accessToken: string };
    const res = await request.get(`${API}/api/v1/tutors/me/verification`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data: { levels: Array<{ level: string; status: string }> };
    };
    return Object.fromEntries(body.data.levels.map((lvl) => [lvl.level, lvl.status]));
  }

  test('renders one card per level with the API status on each card', async ({ page, request }) => {
    const expected = await apiDossierLevels(request);
    await loginAsTutor(page);
    await page.goto('/bn/dashboard/tutor/verification');

    await expect(page.getByTestId('verification-status-hero')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('verification-dossier-error')).toBeHidden();

    for (const level of LEVELS) {
      const card = page.getByTestId(`verification-level-${level}`);
      await expect(card).toBeVisible();
      const status = expected[level];
      expect(status, `API returned a status for the ${level} level`).toBeTruthy();
      await expect(card.getByTestId(`level-status-${level}`)).toHaveText(STATUS_LABELS[status].bn);
    }
  });

  test('keeps dossier actions consistent with the level status', async ({ page, request }) => {
    const expected = await apiDossierLevels(request);
    await loginAsTutor(page);
    await page.goto('/bn/dashboard/tutor/verification');
    await expect(page.getByTestId('verification-status-hero')).toBeVisible({ timeout: 20_000 });

    for (const level of LEVELS) {
      const card = page.getByTestId(`verification-level-${level}`);
      const status = expected[level];
      const editable = [
        'not_started',
        'draft',
        'needs_information',
        'rejected',
        'expired',
      ].includes(status);
      // Evidence can only be attached while the level is with the applicant.
      if (editable) {
        await expect(card.getByTestId(`upload-form-${level}`)).toBeVisible();
        await expect(card.getByTestId(`upload-document-${level}`)).toBeVisible();
      } else {
        await expect(card.getByTestId(`upload-form-${level}`)).toBeHidden();
      }
    }

    // Reviewer-owned statuses never expose applicant actions.
    const inReview = LEVELS.some((level) =>
      ['submitted', 'under_review'].includes(expected[level]),
    );
    if (inReview) {
      for (const level of LEVELS) {
        if (!['submitted', 'under_review'].includes(expected[level])) continue;
        const card = page.getByTestId(`verification-level-${level}`);
        await expect(card.getByTestId(`upload-form-${level}`)).toBeHidden();
        await expect(card.getByTestId(`submit-level-${level}`)).toBeHidden();
      }
    }
  });
});
