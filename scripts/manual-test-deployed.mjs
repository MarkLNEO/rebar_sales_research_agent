#!/usr/bin/env node
/**
 * Manual test script to verify deployed changes
 */

import { chromium } from 'playwright';

const TEST_USER = {
  email: 'cliff.test@nevereverordinary.com',
  password: 'Test123!@#'
};

const BASE_URL = 'https://rebar-sales-research-agent.vercel.app';

async function runManualTest() {
  console.log('🧪 Starting manual test of deployed version...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Test 1: Login
    console.log('📝 Test 1: Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: '.playwright-mcp/TEST_01_login_page.png' });

    await page.getByPlaceholder('you@company.com').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '.playwright-mcp/TEST_02_after_login.png' });

    // Check if we landed on dashboard or onboarding
    const hasNewChat = await page.getByRole('button', { name: /new chat/i }).isVisible().catch(() => false);

    if (hasNewChat) {
      console.log('✅ Login successful - landed on dashboard\n');

      // Test 2: Research Request with Quick Brief mode
      console.log('📝 Test 2: Testing Quick Brief research...');
      await page.screenshot({ path: '.playwright-mcp/TEST_03_dashboard.png', fullPage: true });

      const inputField = page.getByPlaceholder(/Research.*or.*Help me set up/i);
      await inputField.fill('Give me a quick brief on Stripe that I can skim before a call');
      await page.screenshot({ path: '.playwright-mcp/TEST_04_query_entered.png' });

      await inputField.press('Enter');
      console.log('⏳ Waiting for response...');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '.playwright-mcp/TEST_05_waiting_5s.png', fullPage: true });

      // Wait for content to appear
      await page.waitForTimeout(20000);
      await page.screenshot({ path: '.playwright-mcp/TEST_06_response_25s.png', fullPage: true });

      // Wait for completion
      const stopButton = page.getByRole('button', { name: /stop/i });
      let responseComplete = false;
      let attempt = 0;

      while (!responseComplete && attempt < 60) {
        await page.waitForTimeout(5000);
        const stillStreaming = await stopButton.isVisible().catch(() => false);
        if (!stillStreaming) {
          responseComplete = true;
        }
        attempt++;
      }

      console.log('✅ Response complete\n');
      await page.screenshot({ path: '.playwright-mcp/TEST_07_response_complete.png', fullPage: true });

      // Test 3: Check for prompt instruction leak
      console.log('📝 Test 3: Checking for prompt instruction leak...');
      const pageContent = await page.content();
      const hasPromptLeak = pageContent.includes('(20 words each)') || pageContent.includes('20 words each');

      if (hasPromptLeak) {
        console.log('❌ ISSUE FOUND: Prompt instruction leak detected - "(20 words each)" found in page');
      } else {
        console.log('✅ No prompt instruction leak detected');
      }

      // Scroll to find the follow-ups section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '.playwright-mcp/TEST_08_scrolled_to_bottom.png', fullPage: true });

      // Test 4: Check button separation
      console.log('\n📝 Test 4: Checking button separation...');
      const saveButton = page.getByRole('button', { name: /save.*track/i });
      const summarizeButton = page.getByRole('button', { name: /summarize/i });

      const hasSaveButton = await saveButton.isVisible().catch(() => false);
      const hasSummarizeButton = await summarizeButton.isVisible().catch(() => false);

      if (hasSaveButton && hasSummarizeButton) {
        console.log('✅ Both buttons visible separately');
      } else {
        console.log('❌ ISSUE: Buttons not found as separate elements');
        console.log(`  - Save & Track button visible: ${hasSaveButton}`);
        console.log(`  - Summarize button visible: ${hasSummarizeButton}`);
      }

      // Take final screenshot
      await page.screenshot({ path: '.playwright-mcp/TEST_09_final_state.png', fullPage: true });

    } else {
      console.log('⚠️  Unexpected state after login - may have landed on onboarding');
      await page.screenshot({ path: '.playwright-mcp/TEST_ERROR_unexpected_state.png' });
    }

    console.log('\n✅ Manual test complete!');
    console.log('📸 Screenshots saved to .playwright-mcp/TEST_*.png');
    console.log('\n⏸️  Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    await page.screenshot({ path: '.playwright-mcp/TEST_ERROR.png' });
  } finally {
    await browser.close();
  }
}

runManualTest().catch(console.error);
