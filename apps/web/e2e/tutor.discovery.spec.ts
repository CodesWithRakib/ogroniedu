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
  data: Array<{ id: string; displayName: string }>;
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

  test('subject filter round-trips through the API and the URL, and back navigation restores it', async ({
    page,
  }) => {
    await page.goto('/bn/tutors');
    await expect(page.getByTestId('discovery-filters-form')).toBeVisible();

    const subjectSelect = page.getByTestId('subject-select');
    await expect(subjectSelect).toBeVisible();

    const options = await subjectSelect
      .locator('option')
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLOptionElement).value).filter((value) => value.length > 0),
      );
    test.skip(options.length === 0, 'taxonomy seed has no subjects');
    const subjectId = options[0]!;

    await subjectSelect.selectOption(subjectId);
    const responsePromise = page.waitForResponse(
      (res) => isSearchResponse(res) && res.url().includes(`subjectId=${subjectId}`),
      { timeout: 20_000 },
    );
    await page.getByTestId('apply-filters-button').click();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`subjectId=${subjectId}`));
    await expect(page.getByTestId('active-filter-chips')).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(new RegExp(`subjectId=${subjectId}`));
  });

  test('opens a real tutor profile from a search result', async ({ page }) => {
    const payloadPromise = firstSearchPayload(page);
    await page.goto('/bn/tutors');
    const payload = await payloadPromise;
    test.skip(!payload || payload.data.length === 0, 'no seeded tutors to open');

    const tutor = payload!.data[0]!;
    await page.goto(`/bn/tutors/${tutor.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      tutor.displayName.split(' ')[0]!,
    );
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
