# Contributing & Test Policy

This project protects main with fast local checks and thorough CI. Please follow these steps when contributing.

## Branch & PR
- Create a feature branch from `main`.
- Keep commits focused; reference related issue/feature in the subject.
- Open a PR to `main` with a short, scannable description.

## Pre‑push (Local)
- Opt‑in gate: enable with `ENFORCE_PREPUSH=1`.
- What runs when enabled:
  - Build (`npm run build`)
  - Lint (`npm run lint`)
  - Unit tests (`node --test tests/unit/*.test.cjs`)
  - E2E @smoke (`npx playwright test -g @smoke --project=chromium`)
  - Critical memory test TC‑MEM‑000 (`npx playwright test tests/memory.spec.ts -g "TC-MEM-000" --project=chromium`)

Rationale: quick, high‑signal checks that catch regressions without slowing your loop.

## CI (PR)
- Full E2E suite runs in CI:
  - Memory, Research, Onboarding, Preferences, Profile‑Coach, UI
  - HTML report is uploaded as an artifact

## Running Tests Locally
- Dev server: `npm run dev` (default `http://localhost:3000`)
- Point tests at deploy: `TEST_BASE_URL=https://your-app npm run test:memory`
- Memory only: `npm run test:memory`
- All tests: `npm test`
- Show last report: `npx playwright show-report`

## Secrets & Environment
- Do not commit real secrets. Use placeholders in `.env.test` and set real values in local env or CI.
- Required (local): Supabase keys, OpenAI key.
- For deployed runs, ensure the test user exists in that deployment’s DB.

## Debug Tips
- Failing E2E? Open the report and trace: `npx playwright show-report`.
- Memory test timing out? Verify composer loads; use `/research?e2e_open=1` in tests.
- Seeing the login screen mid‑test? Align Supabase project used by the site and by cleanup.

