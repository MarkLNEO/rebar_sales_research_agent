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

// Supabase client for test data management
function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials in environment');
  }

  return createClient(url, key);
}

// Helper to login a user
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/');

  // Check if already logged in
  const isLoggedIn = await page.locator('button:has-text("Sign out")').isVisible().catch(() => false);
  if (isLoggedIn) {
    console.log('Already logged in, skipping login');
    return;
  }

  // Fill login form
  await page.getByPlaceholder('you@company.com').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

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
  await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible({ timeout: 10000 });

  console.log(`Logged in as ${email}`);
}

// Helper to logout
async function logoutUser(page: Page) {
  const isLoggedIn = await page.locator('button:has-text("Sign out")').isVisible().catch(() => false);
  if (isLoggedIn) {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible({ timeout: 5000 });
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
    await loginUser(page, TEST_USERS.cliff.email, TEST_USERS.cliff.password);
    await use(page);
    // Cleanup: logout after test
    await logoutUser(page);
  },

  // Test user fixture
  testUser: async ({}, use) => {
    await use(TEST_USERS.cliff);
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
    page.getByText('Next actions').waitFor({ timeout }),
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
