import { expect, type APIRequestContext, type APIResponse, type Page } from '@playwright/test';

/**
 * Live-stack login helpers that respect the API's login rate limit.
 *
 * `POST /auth/login` allows 5 attempts per minute per IP + identifier
 * (`apps/api/src/modules/auth/auth.service.ts`). The seeded tutor account is
 * shared by several specs, so a fully parallel suite run can legitimately meet
 * a 429; these helpers wait out exactly the window the API reports and retry
 * instead of failing the journey.
 */

/** Minimal shape shared by page responses and API responses. */
interface JsonBodyResponse {
  json(): Promise<unknown>;
}

/** Waits out the retry window reported by a 429 login response. */
export async function waitOutLoginRateLimit(response: JsonBodyResponse): Promise<void> {
  let seconds = 30;
  try {
    const body = (await response.json()) as { retryAfter?: number };
    if (typeof body.retryAfter === 'number') seconds = body.retryAfter;
  } catch {
    // Non-JSON error body: keep the conservative default.
  }
  await new Promise((resolve) => setTimeout(resolve, (seconds + 2) * 1000));
}

/**
 * Logs in through the UI and waits for `expectedUrl`. A 429 response is waited
 * out and retried (bounded); any other failure surfaces through the URL
 * assertion.
 */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string,
  expectedUrl: RegExp,
): Promise<void> {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await page.goto('/bn/login');
    await page.getByTestId('login-identifier-input').fill(email);
    await page.getByTestId('login-password-input').fill(password);
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.url().includes('/auth/login'),
      ),
      page.getByTestId('login-submit-btn').click(),
    ]);
    if (response.status() === 429) {
      await waitOutLoginRateLimit(response);
      continue;
    }
    await expect(page).toHaveURL(expectedUrl, { timeout: 20_000 });
    return;
  }
  throw new Error(
    `loginViaUi: ${email} is still rate-limited after ${attempts} attempts (5 logins/min per account)`,
  );
}

/**
 * API login tolerant of one 429 window (used where a spec reads expected state
 * straight from the API). Callers still assert the final response.
 */
export async function postLoginWithRateLimitRetry(
  request: APIRequestContext,
  apiBaseUrl: string,
  credentials: { identifier: string; password: string },
): Promise<APIResponse> {
  const url = `${apiBaseUrl}/api/v1/auth/login`;
  let response = await request.post(url, { data: credentials });
  if (response.status() === 429) {
    await waitOutLoginRateLimit(response);
    response = await request.post(url, { data: credentials });
  }
  return response;
}
