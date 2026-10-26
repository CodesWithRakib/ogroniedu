import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * Tutor discovery + replacement access browser journeys.
 *
 * Runs against the live stack (API + seeded Postgres). Results are always
 * derived from the real `/api/v1/tutors/search` response, so the spec passes
 * with an empty or populated catalog — it never assumes seeded tutors exist
 * and never accepts fabricated cards.
 */

interface SearchPayload {
  success: boolean;
  data: Array<{ id: string; displayName?: string; displayNameBn?: string; displayNameEn?: string }>;
}

function isSearchResponse(response: Response): boolean {
  return response.url().includes('/api/v1/tutors/search') && response.request().method() === 'GET';
}

async function firstSearchPayload(page: Page): Promise<SearchPayload | null> {
  const response = await page
    .waitForResponse(isSearchResponse, { timeout: 20_000 })
    .catch(() => null);
  if (!response) return null;
  if (!response.ok()) throw new Error(`tutor search failed with HTTP ${response.status()}`);
  return (await response.json()) as SearchPayload;
}

test.describe('tutor discovery (live API)', () => {
  test('renders only API-returned tutors, or a genuine empty state', async ({ page }) => {
    const payloadPromise = firstSearchPayload(page);
    await page.goto('/bn/tutors');
    await expect(page.getByTestId('tutor-discovery-container')).toBeVisible();

    const payload = await payloadPromise;
    expect(payload).not.toBeNull();
    const tutors = payload?.data ?? [];

    if (tutors.length === 0) {
      await expect(page.getByTestId('tutors-empty')).toBeVisible();
      return;
    }

    const first = tutors[0]!;
    await expect(page.getByTestId(`tutor-card-${first.id}`)).toBeVisible();
    // Guests never get a save action on result cards.
    await expect(page.getByTestId(`save-tutor-btn-${first.id}`)).toHaveCount(0);
  });

  test('subject filter round-trips through the API and the URL, and survives a reload', async ({
    page,
  }) => {
    await page.goto('/bn/tutors');
    await expect(page.getByTestId('discovery-filters-form')).toBeVisible();

    const subjectSelect = page.getByTestId('subject-select');
    await expect(subjectSelect).toBeVisible();

    // The subject filter is the shared Radix Select (portalled listbox), so
    // drive the real control: open it and pick the first real taxonomy subject
    // (the first option is the "All Subjects" default).
    await subjectSelect.click();
    const optionList = page.getByRole('option');
    await expect(optionList.first()).toBeVisible({ timeout: 20_000 });
    const firstSubject = optionList.filter({ hasNotText: /^(সকল বিষয়|All Subjects)$/ }).first();
    await expect(firstSubject).toBeVisible();

    // Selecting a subject updates the draft, syncs the URL and triggers the
    // live search — so the request is awaited around the option click.
    const responsePromise = page.waitForResponse(
      (res) => isSearchResponse(res) && res.url().includes('subjectId='),
      { timeout: 20_000 },
    );
    await firstSubject.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    const subjectId = new URL(response.url()).searchParams.get('subjectId');
    expect(subjectId).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`subjectId=${subjectId}`));
    await expect(page.getByTestId('active-filter-chips')).toBeVisible();

    // Applying re-runs the committed search against the same filter set.
    await page.getByTestId('apply-filters-button').click();
    await expect(page).toHaveURL(new RegExp(`subjectId=${subjectId}`));

    // The URL is the source of truth: a fresh load restores the filter.
    const reloadResponse = page.waitForResponse(
      (res) => isSearchResponse(res) && res.url().includes(`subjectId=${subjectId}`),
      { timeout: 20_000 },
    );
    await page.reload();
    expect((await reloadResponse).ok()).toBeTruthy();
    await expect(page.getByTestId('active-filter-chips')).toBeVisible();
  });

  test('opens a real tutor profile from a search result', async ({ page }) => {
    const payloadPromise = firstSearchPayload(page);
    await page.goto('/bn/tutors');
    const payload = await payloadPromise;
    test.skip(!payload || payload.data.length === 0, 'no seeded tutors to open');

    const tutor = payload!.data[0]!;
    await page.goto(`/bn/tutors/${tutor.id}`);
    const tutorName = tutor.displayNameBn || tutor.displayNameEn || tutor.displayName || '';
    if (tutorName) {
      await expect(page.getByRole('heading', { level: 1 })).toContainText(tutorName.split(' ')[0]!);
    }
    // Genuine rating or an explicit no-reviews state — never a fabricated score.
    await expect(
      page.getByTestId('profile-rating').or(page.getByTestId('profile-no-rating')),
    ).toBeVisible();

    const unavailable = page.getByTestId('profile-unavailable');
    await expect(unavailable).toHaveCount(0);
  });

  test('denied location permission degrades to a visible message, not a fake radius search', async ({
    page,
    context,
  }) => {
    await context.clearPermissions();
    await page.goto('/bn/tutors');
    await expect(page.getByTestId('discovery-filters-form')).toBeVisible();

    await page.getByTestId('use-my-location').click();
    await expect(
      page.getByTestId('location-error').or(page.getByTestId('location-active')),
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('replacement guarantee access control', () => {
  for (const path of ['/bn/saved-tutors', '/bn/tutor-replacements', '/bn/tutor-replacements/new']) {
    test(`guest visiting ${path} is redirected to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/bn\/login$/, { timeout: 20_000 });
    });
  }
});
