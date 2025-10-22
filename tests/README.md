# E2E Test Suite - Parallel Execution Framework

Comprehensive end-to-end testing for all user flows using Playwright.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests in parallel
npm test

# Run specific test suite
npm run test:research
npm run test:onboarding
npm run test:preferences
npm run test:profile-coach
npm run test:memory

# Run with UI (interactive mode)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# View test report
npm run test:report
```

---

## Test Organization

### Test Suites

| Suite | File | Focus | Status |
|-------|------|-------|--------|
| **Company Research** | `research.spec.ts` | Quick/Deep/Specific modes, performance, streaming | ✅ 8 tests |
| **Onboarding** | `onboarding.spec.ts` | New user signup, wizard flow, profile setup | ✅ 6 tests |
| **Preferences** | `preferences.spec.ts` | Implicit learning, persistence, JIT prompts | ✅ 8 tests |
| **Profile Coach** | `profile-coach.spec.ts` | Profile updates, ICP config, criteria setup | ✅ 17 tests |
| **Memory & Context** | `memory.spec.ts` | Conversation context, memory persistence | ✅ 17 tests |
| **Tracked Accounts** | `tracked-accounts.spec.ts` | Account tracking, signals, monitoring | 📝 Todo |
| **Bulk Research** | `bulk-research.spec.ts` | CSV upload, batch processing, results | 📝 Todo |
| **Settings** | `settings.spec.ts` | Settings updates, integrations, billing | 📝 Todo |

### Parallel Execution

All test suites run in parallel across multiple workers:
- **Local:** 4 workers
- **CI:** 2 workers
- **Isolated:** Each test has its own browser context

---

## Test Structure

### Fixtures

Located in `tests/fixtures.ts`, provides:

- **`authenticatedPage`** - Pre-logged-in page context
- **`testUser`** - Test user credentials
- **`supabase`** - Supabase client for data management
- **`clearData`** - Cleanup function for test isolation
- **`measurePerformance`** - Performance metric collection

Example usage:

```typescript
import { test, expect } from './fixtures';

test('my test', async ({ authenticatedPage, testUser }) => {
  // Page is already logged in as testUser
  await authenticatedPage.goto('/');
  // ... test code
});
```

### Test Users

Pre-configured test users in `tests/fixtures.ts`:

```typescript
const TEST_USERS = {
  cliff: {
    email: 'cliff.test@rebarhq.com',
    password: 'Test123!@#',
    role: 'Account Executive',
    company: 'Acme Security Solutions',
  },
  sarah: {
    email: 'sarah.test@rebarhq.com',
    password: 'Test123!@#',
    role: 'Sales Director',
    company: 'TechCorp Inc',
  },
};
```

**Setup:** Create these users manually in Supabase before running tests.

---

## Performance Testing

### Built-in Performance Metrics

The `measurePerformance` fixture tracks:

- **TTFB** (Time To First Byte) - First content delta
- **Total Time** - Full request completion
- **Content Length** - Response size

Example:

```typescript
test('performance test', async ({ measurePerformance }) => {
  const metrics = await measurePerformance('Research Tesla');

  expect(metrics.ttfb).toBeLessThan(5000); // <5s TTFB
  expect(metrics.totalTime).toBeLessThan(60000); // <60s total
  console.log('Metrics:', metrics);
});
```

### Performance SLAs

| Mode | Target TTFB | Target Total | Max Content |
|------|-------------|--------------|-------------|
| Quick | <5s | <30s | 800 words |
| Deep | <10s | <90s | Unlimited |
| Specific | <3s | <20s | 600 words |

---

## Parallel Test Runner

### Usage

```bash
# Run all suites in parallel
npm run test:parallel

# With debug logging
npm run test:parallel -- --debug

# With browser visible
npm run test:parallel -- --headed
```

### Output

```
📊 Test Results Summary

┌─────────────────────────────────┬────────┬────────┬─────────┬──────────┐
│ Suite                           │ Passed │ Failed │ Skipped │ Duration │
├─────────────────────────────────┼────────┼────────┼─────────┼──────────┤
│ ✅ onboarding.spec.ts           │      5 │      0 │       0 │    12.3s │
│ ✅ research.spec.ts             │      8 │      0 │       1 │    45.2s │
│ ✅ preferences.spec.ts          │      7 │      0 │       0 │    28.1s │
└─────────────────────────────────┴────────┴────────┴─────────┴──────────┘

📈 Overall Summary

  Suites:    3/3 passed
  Tests:     20/21 passed
  Failed:    0
  Skipped:   1
  Duration:  45.2s
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run tests
        run: npm run test:parallel
        env:
          TEST_BASE_URL: https://rebar-sales-research-agent.vercel.app
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## Writing New Tests

### Basic Template

```typescript
import { test, expect, waitForStreamComplete } from './fixtures';

test.describe('My Feature', () => {
  test('should do something', async ({ authenticatedPage }) => {
    // Arrange
    await authenticatedPage.goto('/');

    // Act
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Test query');
    await authenticatedPage.getByRole('button', { name: 'Send' }).click();

    // Assert
    await waitForStreamComplete(authenticatedPage);
    await expect(authenticatedPage.getByText('Expected result')).toBeVisible();

    // Screenshot for debugging
    await authenticatedPage.screenshot({ path: 'test-results/my-feature.png' });
  });
});
```

### Best Practices

1. **Use fixtures** - Leverage `authenticatedPage`, `clearData`, etc.
2. **Wait for streaming** - Use `waitForStreamComplete()` for research
3. **Check reasoning** - Use `checkReasoningStream()` to verify UX
4. **Take screenshots** - Save to `test-results/` for debugging
5. **Clean up data** - Use `clearData()` for test isolation
6. **Test atomic units** - Each test should be independent

---

## Debugging

### Debug Mode

```bash
# Step through tests in Playwright Inspector
npm run test:debug

# Run specific test
npx playwright test tests/research.spec.ts:10 --debug
```

### Screenshots & Videos

- **Screenshots:** Saved to `test-results/` on failure
- **Videos:** Recorded on first retry
- **Traces:** Captured on first retry

View traces:

```bash
npx playwright show-trace test-results/trace.zip
```

### Console Logs

Tests log performance metrics and indicators:

```javascript
console.log('Metrics:', { ttfb: 1234, totalTime: 45678 });
console.table(results);
```

---

## Data Management

### Test Data Setup

Create test users in Supabase:

```sql
-- Create test user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('cliff.test@rebarhq.com', crypt('Test123!@#', gen_salt('bf')), now());

-- Create profile
INSERT INTO user_profiles (user_id, user_role, company)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'cliff.test@rebarhq.com'),
  'Account Executive',
  'Acme Security Solutions'
);
```

### Test Data Cleanup

The `clearData()` fixture removes:
- Chats and messages
- Tracked accounts
- Bulk research jobs
- Preference signals

Example:

```typescript
test('isolated test', async ({ authenticatedPage, clearData }) => {
  await clearData(); // Start with clean slate

  // ... test code

  // Automatic cleanup after test
});
```

---

## Environment Variables

Required for tests:

```bash
# .env.test
TEST_BASE_URL=https://rebar-sales-research-agent.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Troubleshooting

### Common Issues

#### Tests hang indefinitely

**Cause:** Waiting for element that never appears
**Fix:** Add explicit timeouts: `{ timeout: 10000 }`

#### Authentication fails

**Cause:** Test user doesn't exist in database
**Fix:** Create test users in Supabase (see Data Management)

#### Flaky tests

**Cause:** Race conditions, network issues
**Fix:** Use `waitFor*` helpers, increase timeouts

#### Performance metrics missing

**Cause:** Event listeners not set up
**Fix:** Ensure `measurePerformance` is called before action

---

## Contributing

### Adding New Test Suites

1. Create `tests/my-feature.spec.ts`
2. Add to `TEST_SUITES` in `run-parallel.ts`
3. Add npm script to `package.json`
4. Update this README

### Test Coverage Goals

- **Onboarding:** 100% (critical path)
- **Research:** 90% (core features)
- **Preferences:** 80% (edge cases)
- **Other features:** 70% (happy paths)

---

## Results & Reporting

### HTML Report

```bash
# Generate and view
npm run test:report
```

### JSON Results

Saved to `test-results/results.json`:

```json
{
  "summary": {
    "total": 3,
    "passed": 3,
    "failed": 0,
    "totalTests": 20,
    "duration": 45234
  },
  "results": [...]
}
```

### CI Integration

Parse JSON results in CI for:
- Test badges
- Slack notifications
- Performance tracking
- Regression alerts

---

## Next Steps

- [x] Add Profile Coach tests (17 tests)
- [x] Add Memory & Context tests (17 tests)
- [ ] Add Tracked Accounts tests
- [ ] Add Bulk Research tests
- [ ] Add Settings tests
- [ ] Set up CI/CD pipeline
- [ ] Add performance regression tracking
- [ ] Add visual regression testing (Percy/Chromatic)

