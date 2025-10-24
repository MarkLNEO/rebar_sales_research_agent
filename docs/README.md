# RebarHQ Docs

This folder consolidates the core documentation for the Sales Research Agent. Use this as your single entry point instead of chasing multiple root‑level Markdown files.

- Architecture: `docs/Architecture.md`
- Testing: `docs/Testing.md`
- Conventions: `docs/Conventions.md`
- Changelog: `docs/Changelog.md`

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

