import { test, expect, type Page } from '@playwright/test';
import { loginViaUi } from './support/login';

/**
 * Bilingual tutor profile journey against the live stack.
 *
 * The expected copy is read from the real search API, then asserted on both
 * locale routes. Copy is never asserted from hardcoded fixtures.
 */

const API = process.env.E2E_API_URL || 'http://localhost:4000';
const tutorEmail = process.env.E2E_TUTOR_EMAIL;
const tutorPassword = process.env.E2E_TUTOR_PASSWORD;

interface BilingualTutor {
  id: string;
  displayName: string;
  headlineEn: string | null;
  headlineBn: string | null;
  bioEn: string | null;
  bioBn: string | null;
}

async function fetchBilingualTutor(page: Page): Promise<BilingualTutor | null> {
  const response = await page.request.get(`${API}/api/v1/tutors/search?pageSize=50`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data: BilingualTutor[] };
  return (
    body.data.find(
      (tutor) =>
        Boolean(tutor.headlineEn) &&
        Boolean(tutor.headlineBn) &&
        Boolean(tutor.bioEn) &&
        Boolean(tutor.bioBn),
    ) ?? null
  );
}

test.describe('bilingual tutor profile (live API)', () => {
  test('shows Bangla copy on /bn and English copy on /en', async ({ page }) => {
    const tutor = await fetchBilingualTutor(page);
    test.skip(!tutor, 'seed has no tutor with both Bangla and English copy');

    await page.goto(`/bn/tutors/${tutor!.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      tutor!.displayName.split(' ')[0]!,
    );
    await expect(page.getByText(tutor!.headlineBn!, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(tutor!.bioBn!, { exact: true })).toBeVisible();

    await page.goto(`/en/tutors/${tutor!.id}`);
    await expect(page.getByText(tutor!.headlineEn!, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(tutor!.bioEn!, { exact: true })).toBeVisible();
  });

  test('result cards follow the route language', async ({ page }) => {
    const tutor = await fetchBilingualTutor(page);
    test.skip(!tutor, 'seed has no tutor with both Bangla and English copy');

    await page.goto('/bn/tutors');
    const bnCard = page.getByTestId(`tutor-card-${tutor!.id}`);
    await expect(bnCard).toBeVisible();
    await expect(bnCard.getByText(tutor!.headlineBn!, { exact: true })).toBeVisible();

    await page.goto('/en/tutors');
    const enCard = page.getByTestId(`tutor-card-${tutor!.id}`);
    await expect(enCard).toBeVisible();
    await expect(enCard.getByText(tutor!.headlineEn!, { exact: true })).toBeVisible();
  });
});

test.describe('tutor profile editor', () => {
  test.skip(
    !tutorEmail || !tutorPassword,
    'needs seeded tutor credentials (E2E_TUTOR_EMAIL/PASSWORD)',
  );
  // Both tests read and write the same tutor profile; run them in order so the
  // temporary save/restore in one test cannot race the other's assertion.
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  test('loads the saved Bangla and English values from the API', async ({ page }) => {
    await loginViaUi(page, tutorEmail!, tutorPassword!, /\/bn\/dashboard/);
    await page.goto('/en/dashboard/tutor/profile');

    await expect(page.getByTestId('tutor-profile-form')).toBeVisible();
    await expect(page.getByTestId('nav-tutor-profile')).toBeVisible();

    const login = await page.request.post(`${API}/api/v1/auth/login`, {
      data: { identifier: tutorEmail!, password: tutorPassword! },
    });
    expect(login.ok()).toBeTruthy();
    const { data } = (await login.json()) as {
      data: { accessToken: string };
    };
    const me = await page.request.get(`${API}/api/v1/tutors/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const profile = ((await me.json()) as { data: { profile: BilingualTutor } }).data.profile;

    await expect(page.locator('#headline-en')).toHaveValue(profile.headlineEn ?? '');
    await expect(page.locator('#headline-bn')).toHaveValue(profile.headlineBn ?? '');
    await expect(page.locator('#bio-en')).toHaveValue(profile.bioEn ?? '');
    await expect(page.locator('#bio-bn')).toHaveValue(profile.bioBn ?? '');
  });

  test('saves both languages and the public profile shows them', async ({ page }) => {
    await loginViaUi(page, tutorEmail!, tutorPassword!, /\/bn\/dashboard/);
    await page.goto('/en/dashboard/tutor/profile');
    await expect(page.getByTestId('tutor-profile-form')).toBeVisible();

    const original = {
      headlineEn: await page.locator('#headline-en').inputValue(),
      headlineBn: await page.locator('#headline-bn').inputValue(),
      bioEn: await page.locator('#bio-en').inputValue(),
      bioBn: await page.locator('#bio-bn').inputValue(),
    };
    test.skip(
      Object.values(original).some((value) => value.trim() === ''),
      'seed tutor has no Bangla/English copy yet; the editor requires both',
    );

    const stamp = Date.now().toString();
    const updated = {
      headlineEn: `E2E bilingual profile ${stamp}`,
      headlineBn: `ই২ই দ্বিভাষিক প্রোফাইল ${stamp}`,
      bioEn: `English biography written by the E2E journey ${stamp}, with enough characters.`,
      bioBn: `ইংরেজি ও বাংলা দুই ভাষায় লেখা ই২ই যাত্রার পরিচিতি ${stamp}।`,
    };

    const fillAndSave = async (values: typeof updated) => {
      await page.locator('#headline-en').fill(values.headlineEn);
      await page.locator('#headline-bn').fill(values.headlineBn);
      await page.locator('#bio-en').fill(values.bioEn);
      await page.locator('#bio-bn').fill(values.bioBn);
      await page.getByRole('button', { name: /Save profile|প্রোফাইল সংরক্ষণ করুন/ }).click();
      await expect(
        page.getByText(/Profile saved successfully|প্রোফাইল সংরক্ষণ করা হয়েছে/),
      ).toBeVisible();
    };

    // Client-side gate: an English-only profile cannot be saved.
    await page.locator('#headline-bn').fill('');
    await page.getByRole('button', { name: /Save profile|প্রোফাইল সংরক্ষণ করুন/ }).click();
    await expect(page.getByText(/Add your headline in Bangla|শিরোনাম বাংলায় লিখুন/)).toBeVisible();

    try {
      await fillAndSave(updated);

      await page.reload();
      await expect(page.locator('#headline-en')).toHaveValue(updated.headlineEn);
      await expect(page.locator('#headline-bn')).toHaveValue(updated.headlineBn);
      await expect(page.locator('#bio-en')).toHaveValue(updated.bioEn);
      await expect(page.locator('#bio-bn')).toHaveValue(updated.bioBn);

      // The saved copy is served publicly and selected by the route language.
      const search = await page.request.get(
        `${API}/api/v1/tutors/search?q=${encodeURIComponent(stamp)}&pageSize=10`,
      );
      expect(search.ok()).toBeTruthy();
      const body = (await search.json()) as { data: BilingualTutor[] };
      const saved = body.data.find((tutor) => tutor.headlineEn === updated.headlineEn);
      expect(saved, 'saved tutor is not publicly searchable').toBeTruthy();

      await page.goto(`/bn/tutors/${saved!.id}`);
      await expect(page.getByText(updated.headlineBn, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(updated.bioBn, { exact: true })).toBeVisible();

      await page.goto(`/en/tutors/${saved!.id}`);
      await expect(page.getByText(updated.headlineEn, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(updated.bioEn, { exact: true })).toBeVisible();
    } finally {
      // Restore the seeded copy so the suite stays rerunnable.
      await page.goto('/en/dashboard/tutor/profile');
      await expect(page.getByTestId('tutor-profile-form')).toBeVisible();
      await fillAndSave(original);
    }
  });
});
