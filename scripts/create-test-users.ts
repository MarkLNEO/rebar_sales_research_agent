#!/usr/bin/env ts-node
/**
 * Create test users via signup flow
 */

import { chromium } from 'playwright';

const TEST_USERS = [
  {
    email: 'cliff.test@rebarhq.ai',
    password: 'Test123!@#',
    name: 'Cliff Test',
  },
  {
    email: 'sarah.test@rebarhq.ai',
    password: 'Test123!@#',
    name: 'Sarah Test',
  }
];

async function createTestUsers() {
  const browser = await chromium.launch({ headless: false });
  const baseURL = 'https://rebar-sales-research-agent.vercel.app';

  for (const user of TEST_USERS) {
    const page = await browser.newPage();

    try {
      console.log(`\n📝 Creating user: ${user.email}`);

      // Go to signup page
      await page.goto(`${baseURL}/login`);
      await page.getByText(/sign up/i).click();

      // Fill signup form
      await page.getByPlaceholder('you@company.com').fill(user.email);
      await page.getByPlaceholder(/choose a password|password/i).fill(user.password);

      // Submit
      await page.getByRole('button', { name: /create account|sign up/i }).click();

      // Wait for success or error
      await page.waitForTimeout(3000);

      const errorVisible = await page.getByText(/already registered|user already exists/i).isVisible().catch(() => false);

      if (errorVisible) {
        console.log(`  ⚠️  User already exists`);
      } else {
        console.log(`  ✅ User created successfully`);
      }

      await page.close();
    } catch (err: any) {
      console.error(`  ❌ Failed: ${err.message}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('\n✅ Done!');
}

createTestUsers();
