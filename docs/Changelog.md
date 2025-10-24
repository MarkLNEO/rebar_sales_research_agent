# Changelog (High Level)

## Unreleased
- Mobile UX (Stage 1)
  - Sidebar collapsed by default on phones; full‑screen overlay when open
  - Research sections: tighter spacing and single‑column readability on small screens
  - Links wrap and lists keep consistent indent; chips align and wrap
  - Desktop unaffected
- Reliability & E2E
  - Unified reasoning indicator with ETA/progress (Task ≈ 1:00; Conversation ≈ 0:30)
  - New smoke: fail fast on error toasts/banners (prevents silent P0 regressions)
  - Added `/api/preferences` to upsert user preferences and avoid 500s

## v2.1
- Deterministic ICP Fit scoring (server‑computed) with version and UI breakdown
- Responses API migration for follow‑ups with robust fallback
- Exact terminology mapping enforced in bullets and headings
- Single inline reasoning; removed deprecated reasoning block
- Sidebar compactness: tracked accounts <= 40vh; Recent Chats always visible; no Hot+Stale conflict

## v2.0
- UAT compliance and preference learning; watchlist persistence; performance improvements
