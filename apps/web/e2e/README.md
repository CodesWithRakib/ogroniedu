# Browser E2E (Playwright)

Specs in this directory run against a **live staging stack** — they are not
unit tests and never run in `pnpm test`.

## Run locally

1. Start Postgres + API + web (staging compose at repo root):
   `docker compose -f docker-compose.staging.yml up --build -d`
2. Migrate + seed: `pnpm db:migrate && pnpm db:seed`
3. Install browsers once: `pnpm --filter @ogroniedu/web exec playwright install chromium`
4. Run: `E2E_BASE_URL=http://localhost:5000 pnpm --filter @ogroniedu/web e2e`

## Seeded journeys

`journey.booking.spec.ts` needs real seeded accounts and **skips** without
them (skipped ≠ passed):

- `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD`
- `E2E_TUTOR_EMAIL` / `E2E_TUTOR_PASSWORD`

Local development shortcut (dev database only — seeds refuse production):
`pnpm db:seed` creates demo accounts sharing the documented dev-only
password `OgroniDev#2026`:

- student: `student.demo@ogroniedu.com`
- tutor: `tutor.demo@ogroniedu.com`
- guardian: `guardian.demo@ogroniedu.com`
- admin (super_admin): `admin.demo@ogroniedu.com`

`admin.console.spec.ts` additionally needs `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`; it registers disposable student/tutor accounts per run
via the real API for setup (all assertions stay browser-visible) and drives the
three-level verification dossier (upload NID sides → submit the identity level →
approve both documents → approve the level) plus suspend/reactivate entirely
through the UI.

`tutor.verification.spec.ts` uses `E2E_TUTOR_EMAIL` / `E2E_TUTOR_PASSWORD` and
asserts the tutor verification page shows exactly the per-level statuses the API
reports, including which levels still expose evidence-upload actions.

Credentialed specs log in through the shared helpers in `e2e/support/login.ts`.
Logins are rate-limited by the API (5 attempts/min per IP + account) and the
seeded accounts are shared across parallel specs, so the helpers wait out a
reported 429 window and retry instead of failing the journey.

In CI the same accounts come from repository secrets, and
`scripts/check-e2e-skips.mjs` fails the job when the Playwright JSON report
shows any skipped test — a missing credential cannot silently turn journeys
green.

Smoke (`smoke.public.spec.ts`) and guard (`auth.guards.spec.ts`) specs need
no credentials. The contact-form smoke proves backend wiring: it passes on
either a ticket reference (API up) or a visible submit error (API down).
