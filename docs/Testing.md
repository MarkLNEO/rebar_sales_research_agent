# Testing

## Unit tests

- Node test runner (`node:test`) used for API/logic tests
- Run all:
  ```bash
  npm run build && node --test tests/unit
  ```
- Keep tests deterministic (mock OpenAI and Supabase; assert outputs)

## Playwright

- Config in `playwright.config.ts`
- Local run (no server):
  ```bash
  npx playwright test
  ```
- CI: set `PLAYWRIGHT_EMAIL` / `PLAYWRIGHT_PASSWORD` for pre-auth in `tests/global-setup.ts`
- To skip global setup locally: `SKIP_GLOBAL_SETUP=1 npx playwright test`
- Reporter outputs:
  - JSON → `test-results/results.json`
  - HTML → `playwright-report`

## What to assert

- Sidebar
  - Tracked accounts area height <= 40vh
  - No “Hot” + “Stale” chips together
  - Recent Chats visible and clickable
- Terminology
  - Buying Signals bullets use exact labels configured by the user
  - No snake_case tokens in visible UI
- Follow-ups
  - 3–5 questions; end with “?”; ≤18 words; subject-safe
- Reasoning UI
  - Single inline element; never rendered as a second block below response

