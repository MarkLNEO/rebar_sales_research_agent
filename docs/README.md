# RebarHQ Docs

This folder consolidates the core documentation for the Sales Research Agent. Use this as your single entry point instead of chasing multiple root‑level Markdown files.

- Architecture: `docs/Architecture.md`
- Testing: `docs/Testing.md`
- Contributing: `docs/CONTRIBUTING.md`
- Conventions: `docs/Conventions.md`
- Changelog: `docs/Changelog.md`

## What’s new (highlights)

- Unified reasoning indicator with ETA/progress (Task ≈ 1:00, Conversation ≈ 0:30)
- Mobile: sidebar collapsed by default and opens as a full‑screen overlay; research sections are denser and scannable
- Links and lists no longer overflow on phones; chips align and wrap naturally
- P0 E2E guard: happy‑path smoke fails fast on any error toast/banner
- Preferences API (`/api/preferences`): prevents 500s when saving research preferences

## Quickstart

1. Install dependencies
   ```bash
   npm install
   ```
2. Configure env
   ```bash
   cp .env.local.example .env.local
   # Edit keys (OpenAI, Supabase, Vercel, etc.)
   ```
3. Dev server
   ```bash
   npm run dev
   ```
4. Build
   ```bash
   npm run build
   ```

## What’s in this app

- OpenAI Responses API with structured output for follow‑ups and research
- Deterministic ICP Fit scoring (see `shared/scoring.ts`) with an in‑UI breakdown
- Exact terminology mapping (e.g., “Data Breaches”, “Leadership Changes”) applied consistently in UI
- Single, inline “reasoning” surface (no deprecated element)
- Compact sidebar with visible “Recent Chats” and non‑conflicting chips

## Legacy/Archived Reports (read‑only)

Historical reports and one‑off analyses have been consolidated under `docs/legacy/` (e.g., `UAT_FINAL_REPORT.md`, `CRITICAL_P0_FAILURE_ANALYSIS.md`). They remain for auditability but are not the source of truth. Prefer this docs hub; refer to legacy files only for historical context.
