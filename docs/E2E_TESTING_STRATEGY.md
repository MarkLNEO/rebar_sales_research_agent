# End‑to‑End Testing Strategy and Playbook

This document explains what our E2E tests do, why we made specific changes, how they run in local/CI, and how to debug when things go wrong. Treat this as the source of truth for future agents and contributors.

## What We Test
- Conversation memory and context continuity (TC‑MEM‑000 and follow‑ons)
- Research flows (Quick/Deep/Specific), streaming indicators, performance sanity
- Onboarding and preference persistence
- UI/UX smoke checks (@smoke)

## Key Product Behaviors The Suite Assumes
- The assistant bubble (`role="assistant"`) exists only while streaming.
- After streaming completes, the final report renders as structured content (no `role="assistant"`).
- A completion sentinel exists: `data-testid="stream-complete"` (the "Next actions" bar).

## Changes We Made (and Why)
- Deterministic first turn in TC‑MEM‑000
  - Use “Quick brief …” for the first visible turn to ensure predictable first render.
  - Wait order: first minimal streaming content, then `stream-complete`.
  - Rationale: removes first‑turn attach race and aligns with product’s streaming lifecycle.

- Composer access is explicit and stable
  - New test hook: `/research?e2e_open=1` forces chat creation/open and focuses the composer.
  - Textarea has `data-testid="composer-input"`.
  - Tests click safe candidates (Company Researcher / New session / Research a company) up to 3 times if needed.
  - Rationale: dashboards vary by user/profile; this guarantees the chat composer is present.

- Robust waits for streaming and completion
  - `waitForAssistantContent` now succeeds if either a streaming assistant bubble emits text or `stream-complete` is visible.
  - Rationale: tolerate environments where the final output arrives right as the bubble is torn down.

- Login/session hardening
  - Success detection uses multiple signals (New chat/New session/chat-surface/composer).
  - Data cleanup uses service‑role lookups to avoid invalidating the browser session.
  - Rationale: prevent mid‑test sign‑in bounces.

## What Runs When
- Pre‑push (Husky, when `ENFORCE_PREPUSH=1`):
  - Build + Lint
  - Unit tests
  - E2E @smoke
  - TC‑MEM‑000 (conversation memory across turns)

- CI (PRs):
  - Full E2E suite (memory, research, onboarding, preferences, profile‑coach, UI)
  - HTML report artifact

- Optional: Nightly full suite for additional confidence

## Environment Setup
- Tests load `.env.test` then `.env.local`.
- Required (local):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`
  - Optional: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` (defaults available)
- Deployed runs:
  - Set `TEST_BASE_URL=https://<your-app>`
  - Ensure the test user exists in that deployment’s DB (or skip DB cleanup for prod runs)

## How To Run
- Local dev server: `npm run dev` (Next.js at http://localhost:3000)
- Memory suite only: `npm run test:memory`
- Full suite: `npm test`
- Show last report: `npx playwright show-report`

## Common Bottlenecks and Symptoms
- No assistant bubble after stream completes
  - Expected: final structured content renders without `role="assistant"`.
  - Fix: our waits already treat `stream-complete` as success.

- Composer never appears
  - Symptom: timeouts filling `Message agent…`.
  - Checklist:
    - Use `/research?e2e_open=1` to force open the chat
    - Confirm `data-testid="composer-input"` is present
    - Ensure the page isn’t stuck on Sign In (credentials)

- Session bounces back to Sign In mid‑test
  - Symptom: error context shows login screen.
  - Fixes:
    - Align Supabase project used by the site and by test data cleanup
    - Verify `TEST_USER_EMAIL` and password exist in that environment

- Credits exhausted (unit tests)
  - Symptom: “credits exhausted” messages.
  - Fix: seed or mock credits in unit tests or via test fixture.

## Debug Checklist
1) Open report: `npx playwright show-report`
2) Inspect failing test’s video/screenshot/trace
3) Verify env:
   - Local: keys in `.env.test`, app running, user credentials valid
   - Deployed: `TEST_BASE_URL` points to the live app, test user exists in that DB
4) Re-run single test with list reporter: 
   `npx playwright test tests/memory.spec.ts -g "TC-MEM-000" --project=chromium --reporter=list`
5) Clear auth state if needed: delete `playwright/.auth/user.json`

## Rationale Recap
- We removed environment‑sensitive races by:
  - forcing a deterministic first turn;
  - matching waits to the product’s real stream/complete lifecycle;
  - making the composer addressable and guaranteed present when tests start.

