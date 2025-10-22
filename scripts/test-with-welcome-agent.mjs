#!/usr/bin/env node
/**
 * Test deployed changes - handle Welcome Agent properly
 */

import { chromium } from 'playwright';

const TEST_USER = {
  email: 'cliff.test@nevereverordinary.com',
  password: 'Test123!@#'
};

const BASE_URL = 'https://rebar-sales-research-agent.vercel.app';

async function testDeployedChanges() {
  console.log('🧪 Testing deployed changes...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  try {
    // Login
    console.log('📝 Step 1: Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder('you@company.com').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
    console.log('✅ Logged in\n');
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_01_after_login.png' });

    // The Welcome Agent input is RIGHT THERE in the modal
    console.log('📝 Step 2: Using Welcome Agent to submit query...');

    // The input has placeholder "Research Boeing or 'Help me set up'"
    const welcomeInput = page.locator('input[placeholder*="Research"], input[placeholder*="Help me set up"]').first();

    await welcomeInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('  Found Welcome Agent input');

    await welcomeInput.fill('Give me a quick brief on Salesforce that I can skim before a call');
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_02_query_filled.png' });

    // Click the Continue button
    await page.getByRole('button', { name: /continue/i }).click();
    console.log('✅ Submitted query via Welcome Agent\n');

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_03_processing.png', fullPage: true });

    // Wait for response to start
    console.log('📝 Step 3: Waiting for research response...');
    await page.waitForTimeout(25000);
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_04_response_25s.png', fullPage: true });

    // Wait for completion (Stop button disappears)
    console.log('  Waiting for completion...');
    let attempts = 0;
    while (attempts < 50) {
      await page.waitForTimeout(5000);
      const stopBtn = await page.getByRole('button', { name: /stop/i }).isVisible().catch(() => false);
      if (!stopBtn) {
        break;
      }
      attempts++;
      if (attempts % 6 === 0) {
        console.log(`    Still streaming (${attempts * 5}s)...`);
      }
    }

    console.log('✅ Response complete\n');
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_05_complete.png', fullPage: true });

    // ==== TEST 1: Prompt Instruction Leak ====
    console.log('📝 TEST 1: Checking for prompt instruction leak...');
    const pageContent = await page.content();

    const leakFound =
      pageContent.includes('(20 words each)') ||
      pageContent.includes('20 words each');

    if (leakFound) {
      console.log('❌ FAILED: Prompt instruction leak detected');
      console.log('   Found "(20 words each)" in page content');

      // Find and highlight the leak
      const heading = page.locator('text=/.*follow.*up.*/i').first();
      if (await heading.isVisible().catch(() => false)) {
        await heading.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '.playwright-mcp/DEPLOY_06_LEAK_FOUND.png' });
      }
    } else {
      console.log('✅ PASSED: No prompt instruction leak');
    }

    // ==== TEST 2: Button Separation ====
    console.log('\n📝 TEST 2: Checking button separation...');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const saveTrackBtn = page.getByRole('button', { name: /save.*track/i });
    const summarizeBtn = page.getByRole('button', { name: /summarize/i });

    const hasSave = await saveTrackBtn.isVisible().catch(() => false);
    const hasSummarize = await summarizeBtn.isVisible().catch(() => false);

    if (hasSave && hasSummarize) {
      console.log('✅ PASSED: Both buttons visible separately');
      console.log('   - "Save & Track" button: visible');
      console.log('   - "Summarize" button: visible');
    } else {
      console.log('❌ FAILED: Buttons not properly separated');
      console.log(`   - "Save & Track" button: ${hasSave ? 'visible' : 'NOT visible'}`);
      console.log(`   - "Summarize" button: ${hasSummarize ? 'visible' : 'NOT visible'}`);
    }

    await page.screenshot({ path: '.playwright-mcp/DEPLOY_07_buttons.png' });

    // Final full page screenshot
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_08_final.png', fullPage: true });

    console.log('\n✅ Testing complete!');
    console.log('📸 Screenshots saved to .playwright-mcp/DEPLOY_*.png');

    console.log('\n⏸️  Browser staying open for 30s for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    await page.screenshot({ path: '.playwright-mcp/DEPLOY_ERROR.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

testDeployedChanges().catch(console.error);
