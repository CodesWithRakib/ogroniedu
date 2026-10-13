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

Smoke (`smoke.public.spec.ts`) and guard (`auth.guards.spec.ts`) specs need
no credentials. The contact-form smoke proves backend wiring: it passes on
either a ticket reference (API up) or a visible submit error (API down).
