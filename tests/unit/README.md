# Unit Test Suite

This directory contains fast, dependency-free unit tests that cover the highest-risk pieces of the research agent stack.

## Quick start

```bash
# Run all unit tests
node --test tests/unit/*.test.cjs

# Run a single file
node --test tests/unit/chat-route.test.cjs
```

Each test file bootstraps `ts-node/register/transpile-only` so we can exercise the TypeScript backend modules directly without compiling the entire app.

## Coverage map

| File | Focus |
|------|-------|
| `chat-route.test.cjs` | Conversation streaming, status events, tool usage telemetry, research draft integration |
| `entity-alias.test.cjs` | System + user alias resolution, cache invalidation, Supabase failure handling |
| `preferences-tracker.test.cjs` | Implicit preference learning, batching, auth token handling, retry logic |
| `research-output.test.cjs` | Research markdown normalization, signal terminology injection, decision-maker extraction |
| `context-prompt.test.cjs` | System prompt generation for company research and settings agents |

## Dynamic prompt validation

`context-prompt.test.cjs` builds the live system prompt with realistic user context, learned preferences, and terminology mappings. The assertions verify that:

- Learned depth/summary preferences are reflected in the final prompt
- User-specific terminology (e.g. `AWS → Amazon Web Services`) is embedded in the instructions
- The settings agent emits the profile coach prompt, including JSON save instructions

These checks give us confidence that prompt regressions (missing sections, lost preferences, etc.) are caught before they reach production.

## Maintaining the suite

- **Keep mocks minimal.** If a scenario needs heavy mocking, consider adding an integration or Playwright test instead.
- **Add new files for new subsystems.** Follow the pattern above so everything stays discoverable.
- **Remember to reset module caches.** Each test file clears the relevant `require` caches to ensure fresh imports after modifying state.
- **Document new guarantees.** Update this README when you cover new behaviors so the test surface stays transparent.
