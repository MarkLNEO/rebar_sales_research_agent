#!/usr/bin/env node
/**
 * Test login with test credentials to verify setup
 */

import { chromium } from 'playwright';

async function testLogin() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const baseURL = 'https://rebar-sales-research-agent.vercel.app';

    console.log('🔐 Testing login...');

    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.getByPlaceholder('you@company.com').fill('cliff.test@rebarhq.cai);
    await page.locator('input[type="password"]').fill('Test123!@#');

    // Click login
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait and see what happens
    await page.waitForTimeout(5000);

    // Check for error
    const errorVisible = await page.getByText(/invalid.*password|email not confirmed/i).isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = await page.getByText(/invalid.*password|email not confirmed/i).textContent();
      console.log(`❌ Login failed: ${errorText}`);

      // Take screenshot
      await page.screenshot({ path: 'test-login-error.png' });
    } else {
      // Check if we're logged in
      const loggedIn = await page.getByRole('button', { name: /new chat|sign out/i }).isVisible().catch(() => false);

      if (loggedIn) {
        console.log('✅ Login successful!');
      } else {
        console.log('⚠️  Unknown state');
        await page.screenshot({ path: 'test-login-unknown.png' });
      }
    }

    console.log('\nWaiting 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    await page.screenshot({ path: 'test-login-exception.png' });
  } finally {
    await browser.close();
  }
}

testLogin();
