import { test as base, expect, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Test Fixtures for E2E Tests
 *
 * Provides authenticated page contexts, test users, and helper functions.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *
 *   test('my test', async ({ authenticatedPage, testUser }) => {
 *     // authenticatedPage is already logged in
 *     // testUser contains { email, password, id }
 *   });
 */

// Test user credentials (create these in Supabase manually or via setup script)
export const TEST_USERS = {
  cliff: {
    email: 'cliff.test@nevereverordinary.com',
    password: 'Test123!@#',
    role: 'Account Executive',
    company: 'Acme Security Solutions',
  },
  sarah: {
    email: 'sarah.test@nevereverordinary.com',
    password: 'Test123!@#',
    role: 'Sales Director',
    company: 'TechCorp Inc',
  },
  new_user: {
    email: `test-${Date.now()}@nevereverordinary.com`,
    password: 'Test123!@#',
  },
};

function getEnvLogin() {
  const email = process.env.TEST_USER_EMAIL?.trim();
  const password = process.env.TEST_USER_PASSWORD?.trim();
  if (email && password) return { email, password };
  return null;
}

// Supabase client for test data management
function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[tests] Supabase credentials missing; using no-op client for cleanup.');
    const noop = new Proxy({}, {
      get: () => () => noop,
    });
    const mock: any = {
      from: () => ({
        select: () => ({ eq: () => ({ then: (r: any) => r({ data: [], error: null }) }) }),
        delete: () => ({ eq: () => ({ then: (r: any) => r({ error: null }) }), in: () => ({ then: (r: any) => r({ error: null }) }) }),
      }),
      auth: {
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
      },
    };
    return mock as SupabaseClient;
  }

  return createClient(url, key);
}

// Helper to login a user
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/');

  // Check if already logged in by presence of main UI affordances
  const isLoggedIn = await Promise.race([
    page.getByRole('button', { name: /New Chat/i }).isVisible().catch(() => false),
    page.locator('button:has-text("Sign out")').isVisible().catch(() => false),
  ]);
  if (isLoggedIn) {
    console.log('Already logged in, skipping login');
    return;
  }

  // Attempt to locate login form with multiple fallbacks
  const emailField = (
    await page.getByPlaceholder('you@company.com').elementHandle().catch(() => null)
  ) || (
    await page.locator('input[type="email"]').elementHandle().catch(() => null)
  ) || (
    await page.locator('input[name="email"]').elementHandle().catch(() => null)
  );

  const passwordField = (
    await page.locator('input[type="password"]').elementHandle().catch(() => null)
  ) || (
    await page.getByPlaceholder(/password/i).elementHandle().catch(() => null)
  );

  if (!emailField || !passwordField) {
    console.warn('[tests] Login form not found; continuing without authentication');
    return;
  }

  await page.locator('input[type="email"], input[name="email"], [placeholder="you@company.com"]').first().fill(email);
  await page.locator('input[type="password"], [placeholder*="password" i]').first().fill(password);

  const loginButton = page.getByRole('button', { name: /sign in|log in/i });
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click();
  }

  // Wait for page to load after login
  await page.waitForTimeout(2000);

  // Handle Welcome Agent modal if it appears (for new users)
  const welcomeAgentVisible = await page.getByText(/Welcome Agent|Hey! I'm your Welcome Agent/i).isVisible().catch(() => false);
  if (welcomeAgentVisible) {
    console.log('Dismissing Welcome Agent...');

    // Type "skip" in the input and press Enter to bypass the welcome flow
    const inputField = page.getByPlaceholder(/Research.*or.*Help me set up/i);
    if (await inputField.isVisible().catch(() => false)) {
      await inputField.fill('skip');
      await inputField.press('Enter');
      await page.waitForTimeout(2000);
    }
  }

  // Wait for main app to be visible (New Chat button indicates we're in)
  await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible({ timeout: 20000 });

  console.log(`Logged in as ${email}`);
}

// Helper to logout
async function logoutUser(page: Page) {
  const isLoggedIn = await page.locator('button:has-text("Sign out")').isVisible().catch(() => false);
  if (isLoggedIn) {
    await page.getByRole('button', { name: 'Sign out' }).click();
    try {
      await expect(page.getByPlaceholder('you@company.com')).toBeVisible({ timeout: 5000 });
    } catch {
      // Some deployments redirect differently; don't fail teardown
    }
    console.log('Logged out successfully');
  }
}

// Helper to clear test data for a user
async function clearUserData(userId: string) {
  const supabase = getSupabaseClient();

  // Clear chats and messages
  const { data: chats } = await supabase
    .from('chats')
    .select('id')
    .eq('user_id', userId);

  if (chats && chats.length > 0) {
    const chatIds = chats.map(c => c.id);
    await supabase.from('messages').delete().in('chat_id', chatIds);
    await supabase.from('chats').delete().in('id', chatIds);
  }

  // Clear tracked accounts
  await supabase.from('tracked_accounts').delete().eq('user_id', userId);

  // Clear bulk research jobs
  await supabase.from('bulk_research_jobs').delete().eq('user_id', userId);

  // Clear user-global memory (critical for test isolation)
  await supabase.from('knowledge_entries').delete().eq('user_id', userId);
  await supabase.from('implicit_preferences').delete().eq('user_id', userId);

  console.log(`Cleared test data for user ${userId} (including memory)`);
}

// Helper to measure performance
interface PerformanceMetrics {
  ttfb: number;
  totalTime: number;
  contentLength: number;
}

async function measureResearchPerformance(page: Page, query: string): Promise<PerformanceMetrics> {
  const startTime = Date.now();
  let ttfb = 0;
  let totalTime = 0;

  // Listen for first content delta
  await page.evaluate(() => {
    window.addEventListener('llm:first-delta', ((e: CustomEvent) => {
      (window as any).__ttfb = e.detail.ttfbMs;
    }) as EventListener);
  });

  // Send query
  await page.getByPlaceholder('Message agent...').fill(query);
  await page.getByRole('button', { name: 'Send message' }).click();

  // Wait for completion (Done button or action bar)
  await expect(page.getByText('Next actions')).toBeVisible({ timeout: 120000 });

  totalTime = Date.now() - startTime;

  // Get TTFB from window
  ttfb = await page.evaluate(() => (window as any).__ttfb || 0);

  // Get content length
  const content = await page.locator('[role="assistant"]').last().textContent();
  const contentLength = content?.length || 0;

  return { ttfb, totalTime, contentLength };
}

// Extend base test with fixtures
type TestFixtures = {
  authenticatedPage: Page;
  testUser: typeof TEST_USERS.cliff;
  supabase: SupabaseClient;
  clearData: () => Promise<void>;
  measurePerformance: (query: string) => Promise<PerformanceMetrics>;
};

export const test = base.extend<TestFixtures>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    const envCreds = getEnvLogin();
    const creds = envCreds ?? TEST_USERS.cliff;
    await loginUser(page, creds.email, creds.password);
    await use(page);
    // Cleanup: logout after test
    await logoutUser(page);
  },

  // Test user fixture
  testUser: async ({}, use) => {
    const envCreds = getEnvLogin();
    await use(envCreds ? { ...TEST_USERS.cliff, ...envCreds } : TEST_USERS.cliff);
  },

  // Supabase client fixture
  supabase: async ({}, use) => {
    const client = getSupabaseClient();
    await use(client);
  },

  // Clear data fixture
  clearData: async ({ testUser, supabase }, use) => {
    const clearFn = async () => {
      // Get user ID
      const { data: { user } } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      if (user) {
        await clearUserData(user.id);
      }
    };

    await use(clearFn);
  },

  // Performance measurement fixture
  measurePerformance: async ({ page }, use) => {
    const measureFn = (query: string) => measureResearchPerformance(page, query);
    await use(measureFn);
  },
});

export { expect };

// Helper to create snapshot name
export function snapshotName(testName: string, step: string): string {
  return `${testName.replace(/\s+/g, '_')}_${step}.png`;
}

// Helper to wait for streaming to complete
export async function waitForStreamComplete(page: Page, timeout = 120000) {
  // Wait for either "Next actions" or error state
  await Promise.race([
    // Preferred sentinel for deterministic completion
    page.getByTestId('stream-complete').waitFor({ timeout }),
    // Backwards-compatibility with older UIs
    page.getByText('Next actions').waitFor({ timeout }),
    // Or streaming stop button disappears
    page.getByRole('button', { name: 'Stop' }).waitFor({ state: 'hidden', timeout }).catch(() => undefined),
    // Error state
    page.getByText('error', { exact: false }).waitFor({ timeout }),
  ]);
}

// Helper to check reasoning stream visibility
export async function checkReasoningStream(page: Page) {
  const hasReasoning = await page.getByText('Thinking').isVisible().catch(() => false);
  const hasWebSearch = await page.getByText('Searching the web').isVisible().catch(() => false);
  const hasProgress = await page.getByText('Planning').isVisible().catch(() => false);

  return { hasReasoning, hasWebSearch, hasProgress };
}

// Detect common API error banners/messages in the UI
export async function hasApiError(page: Page): Promise<boolean> {
  const candidates = [
    'Chat API error',
    'Invalid token',
    'Streaming failed',
  ];
  for (const text of candidates) {
    const visible = await page.getByText(new RegExp(text, 'i')).isVisible().catch(() => false);
    if (visible) return true;
  }
  return false;
}
