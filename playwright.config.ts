import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Parallel E2E Testing
 *
 * Test Organization:
 * - tests/onboarding.spec.ts - New user onboarding flow
 * - tests/research.spec.ts - Company research (Quick/Deep/Specific)
 * - tests/profile-coach.spec.ts - Profile Coach interactions
 * - tests/preferences.spec.ts - Preference persistence & learning
 * - tests/memory.spec.ts - Context & memory persistence
 * - tests/tracked-accounts.spec.ts - Account tracking features
 * - tests/bulk-research.spec.ts - CSV upload & bulk research
 * - tests/settings.spec.ts - Settings & profile updates
 *
 * Run all tests in parallel:
 *   npm test
 *
 * Run specific suite:
 *   npm test -- tests/research.spec.ts
 *
 * Run with UI:
 *   npm test -- --ui
 */

export default defineConfig({
  testDir: './tests',

  // Run tests in parallel across multiple workers
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4, // 4 workers locally, 2 in CI

  // Retry failed tests once in CI, none locally
  retries: process.env.CI ? 1 : 0,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'], // Console output
  ],

  // Global timeout for each test
  timeout: 120000, // 2 minutes (research can take 60s+)

  // Expect assertions timeout
  expect: {
    timeout: 10000, // 10s for assertions
  },

  use: {
    // Base URL for all tests
    baseURL: process.env.TEST_BASE_URL || 'https://rebar-sales-research-agent.vercel.app',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    timezoneId: 'UTC',
    locale: 'en-US',
    colorScheme: 'light',
    actionTimeout: 15000,

    // Ignore HTTPS errors (for local dev)
    ignoreHTTPSErrors: true,

    // Headless mode (can override with --headed flag)
    headless: true,

    // Use pre-auth state from globalSetup
    storageState: 'playwright/.auth/user.json',
  },

  // Test projects for different browsers (optional)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test in other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Additional safety in CI
  forbidOnly: !!process.env.CI,

  // Map to data-testid selectors
  testIdAttribute: 'data-testid',

  // Global setup will write storageState (can be skipped with SKIP_GLOBAL_SETUP=1)
  globalSetup: process.env.SKIP_GLOBAL_SETUP ? undefined as any : './tests/global-setup.ts',

  // Web server configuration (for local dev testing)
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
