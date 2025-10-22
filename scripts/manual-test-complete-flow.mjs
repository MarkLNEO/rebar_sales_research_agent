#!/usr/bin/env node
/**
 * Complete manual test with Welcome Agent onboarding
 */

import { chromium } from 'playwright';

const TEST_USER = {
  email: 'cliff.test@nevereverordinary.com',
  password: 'Test123!@#'
};

const BASE_URL = 'https://rebar-sales-research-agent.vercel.app';

async function runCompleteTest() {
  console.log('🧪 Starting complete user flow test...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Test 1: Login
    console.log('📝 Test 1: Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder('you@company.com').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForTimeout(3000);
    console.log('✅ Login submitted\n');

    // Test 2: Handle Welcome Agent
    console.log('📝 Test 2: Handling Welcome Agent modal...');
    const welcomeAgentVisible = await page.getByText(/Welcome Agent/i).isVisible().catch(() => false);

    if (welcomeAgentVisible) {
      console.log('  Welcome Agent modal detected');
      await page.screenshot({ path: '.playwright-mcp/FLOW_01_welcome_agent.png' });

      // Option 1: Skip to research by typing "Research Stripe"
      const inputField = page.getByPlaceholder(/Research.*or.*Help me set up/i);
      await inputField.fill('Research Stripe');
      await page.screenshot({ path: '.playwright-mcp/FLOW_02_skip_typed.png' });

      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(3000);

      console.log('✅ Bypassed Welcome Agent\n');
    }

    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-mcp/FLOW_03_dashboard_loaded.png', fullPage: true });

    // Check if we're on the main app
    const hasNewChat = await page.getByRole('button', { name: /new chat/i }).isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasNewChat) {
      console.log('⚠️  Not on main dashboard yet, waiting longer...');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '.playwright-mcp/FLOW_04_still_waiting.png', fullPage: true });
    }

    // Test 3: Perform a Quick Brief research
    console.log('📝 Test 3: Testing Quick Brief research...');

    // Find the message input (it might already have content from the Welcome Agent bypass)
    const messageInput = page.locator('textarea[placeholder*="Message"]').first();
    const messageInputVisible = await messageInput.isVisible().catch(() => false);

    if (messageInputVisible) {
      // Clear and type new query
      await messageInput.clear();
      await messageInput.fill('Give me a quick brief on Salesforce that I can skim before a call');
      await page.screenshot({ path: '.playwright-mcp/FLOW_05_query_entered.png' });

      // Submit the query
      await messageInput.press('Enter');
      console.log('  Query submitted, waiting for response...');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '.playwright-mcp/FLOW_06_waiting_5s.png', fullPage: true });

      // Wait for content to start streaming
      await page.waitForTimeout(20000);
      await page.screenshot({ path: '.playwright-mcp/FLOW_07_response_streaming.png', fullPage: true });

      // Wait for completion (look for Stop button to disappear)
      console.log('  Waiting for response to complete...');
      let responseComplete = false;
      let attempt = 0;

      while (!responseComplete && attempt < 60) {
        await page.waitForTimeout(5000);
        const stopButton = page.getByRole('button', { name: /stop/i });
        const stillStreaming = await stopButton.isVisible().catch(() => false);
        if (!stillStreaming) {
          responseComplete = true;
        }
        attempt++;
        if (attempt % 6 === 0) {
          console.log(`    Still waiting... (${attempt * 5}s elapsed)`);
        }
      }

      console.log('✅ Response complete\n');
      await page.screenshot({ path: '.playwright-mcp/FLOW_08_response_complete.png', fullPage: true });

      // Test 4: Check for prompt instruction leak
      console.log('📝 Test 4: Checking for prompt instruction leak...');
      const pageContent = await page.content();

      // Check for the specific leak pattern
      const hasPromptLeak = pageContent.includes('(20 words each)') ||
                           pageContent.includes('20 words each') ||
                           pageContent.includes('Three quick follow-ups (20 words each)');

      if (hasPromptLeak) {
        console.log('❌ ISSUE FOUND: Prompt instruction leak detected');
        console.log('   Pattern found: "(20 words each)" in page content');

        // Try to find and screenshot the specific section
        const followUpsHeading = page.locator('text=/.*follow.*up.*/i').first();
        if (await followUpsHeading.isVisible().catch(() => false)) {
          await followUpsHeading.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: '.playwright-mcp/FLOW_09_PROMPT_LEAK_FOUND.png', fullPage: true });
        }
      } else {
        console.log('✅ No prompt instruction leak detected');
      }

      // Test 5: Check button separation
      console.log('\n📝 Test 5: Checking button separation...');

      // Scroll to buttons area
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      const saveButton = page.getByRole('button', { name: /save.*track/i });
      const summarizeButton = page.getByRole('button', { name: /summarize/i });

      const hasSaveButton = await saveButton.isVisible().catch(() => false);
      const hasSummarizeButton = await summarizeButton.isVisible().catch(() => false);

      if (hasSaveButton && hasSummarizeButton) {
        console.log('✅ Both buttons visible separately');

        // Screenshot the buttons area
        await saveButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '.playwright-mcp/FLOW_10_buttons_area.png' });
      } else {
        console.log('❌ ISSUE: Buttons not found as separate elements');
        console.log(`   Save & Track button visible: ${hasSaveButton}`);
        console.log(`   Summarize button visible: ${hasSummarizeButton}`);
      }

      // Final screenshot
      await page.screenshot({ path: '.playwright-mcp/FLOW_11_final_state.png', fullPage: true });

      console.log('\n✅ Complete user flow test finished!');
      console.log('📸 Screenshots saved to .playwright-mcp/FLOW_*.png');

    } else {
      console.log('❌ Could not find message input field');
      await page.screenshot({ path: '.playwright-mcp/FLOW_ERROR_no_input.png', fullPage: true });
    }

    console.log('\n⏸️  Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    await page.screenshot({ path: '.playwright-mcp/FLOW_ERROR.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

runCompleteTest().catch(console.error);
