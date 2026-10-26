# Phase 10 — E2E & Browser Automation

**Date:** Following Phase 9  
**Duration:** 1 day  
**Owner:** QA Lead

---

## Objective

Stabilize and expand the Playwright E2E test suite, ensuring all critical user flows pass reliably in CI.

---

## Scope

| Test File                      | Current Status | Action Required                                             |
| ------------------------------ | -------------- | ----------------------------------------------------------- |
| `auth.e2e.spec.ts`             | ✅ Passing     | Maintain; add logout flow test                              |
| `bookings.e2e.spec.ts`         | ✅ Passing     | Add conflict detection test case                            |
| `payments.e2e.spec.ts`         | ✅ Passing     | Add refund initiation test                                  |
| `tutor-profile.e2e.spec.ts`    | ✅ Passing     | Add verification submission test                            |
| `guardian-linking.e2e.spec.ts` | ✅ Passing     | Add child linking ABAC test                                 |
| `learning.e2e.spec.ts`         | ⚠️ Flaky       | Fix state leakage; add deterministic fixtures; retry config |
| `trust-safety.e2e.spec.ts`     | ✅ Passing     | Maintain; add safety report submission test                 |
| `admin-panel.e2e.spec.ts`      | ✅ Passing     | Maintain; add admin impersonation test                      |
| `notifications.e2e.spec.ts`    | ⚠️ Flaky       | Fix WebSocket timing; increase retry; isolate user state    |
| `taxonomy.e2e.spec.ts`         | ✅ Passing     | Maintain                                                    |

### Action Items

- **S10.1**: Review Playwright config; set `retries: 2` for all test files (already configured)
- **S10.2**: Add `baseURL` config for both staging and production e2e environments
- **S10.3**: Fix `learning.e2e.spec.ts` — identified issues: shared user context leakage across tests; resolve by using unique user per test
- **S10.4**: Fix `notifications.e2e.spec.ts` — identified issues: WebSocket handshake timing; resolve by adding `waitFor` statements
- **S10.5**: Add `@playwright/test` reporter config: `list` + `dot` for clear CI output
- **S10.6**: Run `pnpm turbo run test:e2e` — all 10 test files pass (with 2 retries)
- **S10.7**: Configure GitHub Actions workflow: `npm run test:e2e` on every PR; gate merge on failures
- **S10.8**: Document E2E test conventions in `test/e2e/README.md`

---

## Acceptance Criteria

- [ ] All 10 E2E test files pass within 2 retries
- [ ] `learning.e2e.spec.ts` and `notifications.e2e.spec.ts` no longer marked as "flaky"
- [ ] Playwright test suite runs in < 5 minutes total (parallelized across CI nodes)
- [ ] CI gate: merge blocked if any E2E test fails

---

## E2E Test Conventions (New Tests)

```typescript
// Example pattern for new E2E tests
import { test, expect, describe } from '@playwright/test';

describe('Feature X', () => {
  test('user can do Y', async ({ page }) => {
    // Arrange
    await page.goto('/login');
    await page.fill('#email', 'user@test.com');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("Sign in")');

    // Act
    await page.click('text=Feature X');

    // Assert
    await expect(page.locator('#success')).toBeVisible();
    await expect(page.locator('#error')).not.toBeVisible();
  });
});
```

---

_End of Phase 10._
