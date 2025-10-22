#!/usr/bin/env node
/**
 * Complete onboarding flow and then test research functionality
 */

import { chromium } from 'playwright';

const TEST_USER = {
  email: 'cliff.test@nevereverordinary.com',
  password: 'Test123!@#'
};

const BASE_URL = 'https://rebar-sales-research-agent.vercel.app';

async function completeOnboardingAndTest() {
  console.log('🧪 Complete onboarding and test research...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  try {
    // Login
    console.log('📝 Step 1: Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByPlaceholder('you@company.com').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
    console.log('✅ Logged in\n');

    // Check for Welcome Agent
    const welcomeVisible = await page.getByText(/Welcome Agent/i).isVisible({ timeout: 5000 }).catch(() => false);

    if (welcomeVisible) {
      console.log('📝 Step 2: Completing Welcome Agent onboarding...');
      await page.screenshot({ path: '.playwright-mcp/ONBOARD_01_start.png' });

      // Click one of the example prompts to skip setup
      const researchBoeing = page.getByText('Research Boeing', { exact: true });
      const findStripe = page.getByText('Find companies like Stripe', { exact: true });

      if (await researchBoeing.isVisible().catch(() => false)) {
        await researchBoeing.click();
        console.log('  Clicked "Research Boeing" example');
      } else if (await findStripe.isVisible().catch(() => false)) {
        await findStripe.click();
        console.log('  Clicked "Find companies like Stripe" example');
      } else {
        // Type in the input and click Continue
        const input = page.getByPlaceholder(/Research.*or.*Help me set up/i);
        await input.fill('Research Stripe');
        await page.getByRole('button', { name: /continue/i }).click();
        console.log('  Typed query and clicked Continue');
      }

      await page.waitForTimeout(5000);
      await page.screenshot({ path: '.playwright-mcp/ONBOARD_02_processing.png', fullPage: true });

      // Wait for the research to start or complete
      await page.waitForTimeout(10000);
      await page.screenshot({ path: '.playwright-mcp/ONBOARD_03_research_started.png', fullPage: true });

      console.log('✅ Onboarding bypassed\n');
    }

    // Now we should be on the main dashboard
    console.log('📝 Step 3: Verifying we reached the dashboard...');
    await page.waitForTimeout(3000);

    const newChatVisible = await page.getByRole('button', { name: /new chat/i }).isVisible({ timeout: 10000 }).catch(() => false);

    if (newChatVisible) {
      console.log('✅ Successfully reached dashboard\n');

      // Start a new chat for our actual test
      console.log('📝 Step 4: Starting new chat for clean test...');
      await page.getByRole('button', { name: /new chat/i }).click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '.playwright-mcp/TEST_01_new_chat.png', fullPage: true });
    }

    // Perform the actual research test
    console.log('📝 Step 5: Performing research test...');

    // Find the input field
    const inputSelectors = [
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Research"]',
      'input[placeholder*="Message"]',
      'div[contenteditable="true"]'
    ];

    let inputFound = false;
    let inputElement = null;

    for (const selector of inputSelectors) {
      inputElement = page.locator(selector).first();
      if (await inputElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`  Found input with selector: ${selector}`);
        inputFound = true;
        break;
      }
    }

    if (!inputFound) {
      console.log('❌ Could not find input field');
      await page.screenshot({ path: '.playwright-mcp/TEST_ERROR_no_input.png', fullPage: true});
      throw new Error('Input field not found');
    }

    // Type and submit the query
    await inputElement.fill('Give me a quick brief on Salesforce that I can skim before a call');
    await page.screenshot({ path: '.playwright-mcp/TEST_02_query_typed.png'});

    await inputElement.press('Enter');
    console.log('  Query submitted');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '.playwright-mcp/TEST_03_waiting_5s.png', fullPage: true });

    // Wait for response to stream
    console.log('  Waiting for response (30s)...');
    await page.waitForTimeout(30000);
    await page.screenshot({ path: '.playwright-mcp/TEST_04_response_30s.png', fullPage: true });

    // Wait for completion
    console.log('  Waiting for completion...');
    let complete = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(5000);
      const stopBtn = page.getByRole('button', { name: /stop/i });
      const stillStreaming = await stopBtn.isVisible().catch(() => false);
      if (!stillStreaming) {
        complete = true;
        break;
      }
      if ((i + 1) % 6 === 0) {
        console.log(`    Still streaming... (${(i + 1) * 5}s)`);
      }
    }

    console.log('✅ Response complete\n');
    await page.screenshot({ path: '.playwright-mcp/TEST_05_complete.png', fullPage: true });

    // TEST: Check for prompt instruction leak
    console.log('📝 Step 6: Checking for prompt instruction leak...');
    const content = await page.content();

    const leakPatterns = [
      '(20 words each)',
      '20 words each',
      'Three quick follow-ups (20 words each)',
      'Proactive Follow-Ups (20 words each)'
    ];

    let leakFound = false;
    for (const pattern of leakPatterns) {
      if (content.includes(pattern)) {
        console.log(`❌ PROMPT LEAK FOUND: "${pattern}"`);
        leakFound = true;
      }
    }

    if (!leakFound) {
      console.log('✅ NO PROMPT LEAK - Fix is working!');
    }

    // Scroll to see follow-ups
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '.playwright-mcp/TEST_06_scrolled_bottom.png', fullPage: true });

    // TEST: Check button separation
    console.log('\n📝 Step 7: Checking button separation...');

    const saveBtn = page.getByRole('button', { name: /save.*track/i });
    const summBtn = page.getByRole('button', { name: /summarize/i });

    const hasSave = await saveBtn.isVisible().catch(() => false);
    const hasSumm = await summBtn.isVisible().catch(() => false);

    if (hasSave && hasSumm) {
      console.log('✅ Both buttons found separately');
    } else {
      console.log('⚠️  Button check:');
      console.log(`   Save & Track: ${hasSave}`);
      console.log(`   Summarize: ${hasSumm}`);
    }

    await page.screenshot({ path: '.playwright-mcp/TEST_07_final.png', fullPage: true });

    console.log('\n✅ All tests complete!');
    console.log('📸 Screenshots: .playwright-mcp/TEST_*.png');

    console.log('\n⏸️  Keeping browser open for 30s for manual review...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    await page.screenshot({ path: '.playwright-mcp/ERROR.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

completeOnboardingAndTest().catch(console.error);
