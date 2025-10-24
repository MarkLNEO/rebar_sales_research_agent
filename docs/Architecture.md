# Architecture

## High Level

- UI: Next.js App Router + React components in `src/components` and `src/page-components`
- API: Route handlers in `app/api/*` using OpenAI Responses API, Supabase, and cached context
- Context: `app/api/lib/contextLoader.ts` builds the system prompt from profile, criteria, signals, memory
- Deterministic scoring: `shared/scoring.ts` computes ICP Fit using fixed weights and a version tag

## Agents and Responses

- Company Research (`/api/ai/chat`)
  - Streams status, reasoning, and content via SSE
  - Uses optional web_search tool for fresh facts
  - Emits normalized content for UI (no leaking JSON/underscores)

- Follow‑ups (`/api/ai/followups`)
  - Responses API with `text.format` JSON schema
  - Fallback to synthesized questions if schema output is missing
  - Terminology enforced post‑parse

## Terminology & Disambiguation

- Learns user term mappings (e.g., BNPL → buy now, pay later) to `user_term_mappings`
- Injects mappings into the system prompt each request via context loader
- Renderer normalizes headings/bullets to the exact user label

## ICP Fit Scoring

- Never model‑decided: computed in `shared/scoring.ts`
- Weights (v1.0.0):
  - Critical +15/−20, Important +10/−10, Nice +5/−5
  - Signals: Critical ≤30d +10, Important ≤60d +5 (cap +20)
  - Optional mild size penalty for extreme mismatch
  - Base 50, clamp 0–100, round to nearest 5
- UI shows a “How is this calculated?” breakdown with version

