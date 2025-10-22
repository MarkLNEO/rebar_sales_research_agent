#!/usr/bin/env node
/**
 * Create test users via signup flow
 */

import { chromium } from 'playwright';

const TEST_USERS = [
  {
    email: 'cliff.test@rebarhq.com',
    password: 'Test123!@#',
    name: 'Cliff Test',
  },
  {
    email: 'sarah.test@rebarhq.com',
    password: 'Test123!@#',
    name: 'Sarah Test',
  }
];

async function createTestUsers() {
  const browser = await chromium.launch({ headless: true });
  const baseURL = 'https://rebar-sales-research-agent.vercel.app';

  for (const user of TEST_USERS) {
    const page = await browser.newPage();

    try {
      console.log(`\n📝 Creating user: ${user.email}`);

      // Go to login page
      await page.goto(`${baseURL}/login`);
      await page.waitForLoadState('domcontentloaded');

      // Click Sign up link
      const signupLink = page.getByText(/sign up/i).first();
      await signupLink.click();
      await page.waitForTimeout(1000);

      // Fill signup form
      await page.getByPlaceholder('you@company.com').fill(user.email);
      await page.locator('input[type="password"]').fill(user.password);

      // Submit
      await page.getByRole('button', { name: /create account|sign up/i }).click();

      // Wait for success or error
      await page.waitForTimeout(5000);

      const errorVisible = await page.getByText(/already registered|user already exists/i).isVisible().catch(() => false);

      if (errorVisible) {
        console.log(`  ⚠️  User already exists`);
      } else {
        // Check if we're on the dashboard/onboarding
        const newChatVisible = await page.getByRole('button', { name: /new chat/i }).isVisible().catch(() => false);
        if (newChatVisible) {
          console.log(`  ✅ User created successfully`);
        } else {
          console.log(`  ✅ User created (may need email confirmation)`);
        }
      }

      await page.close();
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      await page.screenshot({ path: `test-user-error-${user.email}.png` });
      await page.close();
    }
  }

  await browser.close();
  console.log('\n✅ Done!');
}

createTestUsers().catch(console.error);
