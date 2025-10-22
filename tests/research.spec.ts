import { test, expect, waitForStreamComplete, checkReasoningStream } from './fixtures';

/**
 * Company Research Agent Tests
 *
 * Tests the core research functionality including:
 * - Quick brief mode (concise output)
 * - Deep intelligence mode (comprehensive output)
 * - Specific follow-up mode (targeted answers)
 * - Performance (TTFB, total time)
 * - Streaming behavior
 * - Mode selection UI
 */

test.describe('Company Research Agent', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to home page
    await authenticatedPage.goto('/');
    await expect(authenticatedPage.getByRole('button', { name: 'New Chat' })).toBeVisible();
  });

  test('Quick brief mode - should generate concise output', async ({ authenticatedPage, measurePerformance }) => {
    const query = 'Give me a quick brief on Salesforce that I can skim before a call';

    // Measure performance
    const metrics = await measurePerformance(query);

    // Verify TTFB is reasonable
    expect(metrics.ttfb).toBeLessThan(5000); // <5s TTFB
    expect(metrics.ttfb).toBeGreaterThan(0); // Should have TTFB

    // Verify total time is reasonable
    expect(metrics.totalTime).toBeLessThan(60000); // <60s total

    // Verify output length (Quick mode should be 400-600 words)
    const wordCount = metrics.contentLength / 5; // Rough estimate: 5 chars per word
    expect(wordCount).toBeGreaterThan(300); // At least 300 words
    expect(wordCount).toBeLessThan(1000); // Less than 1000 words (concise)

    // Verify mode button shows "Quick" as selected
    await expect(authenticatedPage.getByRole('button', { name: 'Quick' }).filter({ hasText: /quick/i })).toHaveClass(/border-blue-500|bg-blue/);

    // Verify activity indicators were shown
    const reasoning = await checkReasoningStream(authenticatedPage);
    expect(reasoning.hasReasoning || reasoning.hasWebSearch || reasoning.hasProgress).toBe(true);

    // Take screenshot for visual verification
    await authenticatedPage.screenshot({ path: 'test-results/research_quick_brief.png', fullPage: true });
  });

  test('Deep intelligence mode - should generate comprehensive output', async ({ authenticatedPage, measurePerformance }) => {
    const query = 'Give me full deep intelligence on Microsoft - I need everything';

    const metrics = await measurePerformance(query);

    // Deep mode allows longer processing
    expect(metrics.ttfb).toBeLessThan(10000); // <10s TTFB
    expect(metrics.totalTime).toBeLessThan(120000); // <120s total

    // Verify output length (Deep mode should be 1500+ words)
    const wordCount = metrics.contentLength / 5;
    expect(wordCount).toBeGreaterThan(1000); // At least 1000 words (comprehensive)

    // Verify mode button shows "Deep" as selected
    await expect(authenticatedPage.getByRole('button', { name: 'Deep' })).toHaveClass(/border-blue-500|bg-blue/);

    await authenticatedPage.screenshot({ path: 'test-results/research_deep_intelligence.png', fullPage: true });
  });

  test('Specific follow-up mode - should answer targeted question', async ({ authenticatedPage }) => {
    // First, do a quick research to set context
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Quick brief on Stripe');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Now ask a specific follow-up
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What is their tech stack?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Verify mode shows "Specific"
    await expect(authenticatedPage.getByRole('button', { name: 'Specific' })).toHaveClass(/border-blue-500|bg-blue/);

    // Verify output is concise (not a full report)
    const content = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const wordCount = (content?.length || 0) / 5;
    expect(wordCount).toBeLessThan(600); // Specific answers should be brief

    await authenticatedPage.screenshot({ path: 'test-results/research_specific_followup.png', fullPage: true });
  });

  test('Mode switching - should regenerate with different mode', async ({ authenticatedPage }) => {
    // Start with quick brief
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Adobe');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Get initial content length
    const quickContent = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const quickLength = quickContent?.length || 0;

    // Switch to Deep mode
    await authenticatedPage.getByRole('button', { name: 'Deep' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Get deep content length
    const deepContent = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const deepLength = deepContent?.length || 0;

    // Deep should be significantly longer
    expect(deepLength).toBeGreaterThan(quickLength * 1.5);

    await authenticatedPage.screenshot({ path: 'test-results/research_mode_switching.png', fullPage: true });
  });

  test('Streaming indicators - should show progress during research', async ({ authenticatedPage }) => {
    // Track which indicators appeared
    const indicators = {
      planning: false,
      webSearch: false,
      reasoning: false,
      content: false,
    };

    // Set up listeners for indicators
    await authenticatedPage.evaluate(() => {
      (window as any).__indicators = { planning: false, webSearch: false, reasoning: false, content: false };

      const observer = new MutationObserver(() => {
        if (document.body.textContent?.includes('Planning')) {
          (window as any).__indicators.planning = true;
        }
        if (document.body.textContent?.includes('Searching the web')) {
          (window as any).__indicators.webSearch = true;
        }
        if (document.body.textContent?.includes('Thinking')) {
          (window as any).__indicators.reasoning = true;
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Start research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Tesla');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();

    // Wait a few seconds to let indicators appear
    await authenticatedPage.waitForTimeout(3000);

    // Check which indicators appeared
    const finalIndicators = await authenticatedPage.evaluate(() => (window as any).__indicators);

    // At least one progress indicator should have appeared
    expect(
      finalIndicators.planning ||
      finalIndicators.webSearch ||
      finalIndicators.reasoning
    ).toBe(true);

    await waitForStreamComplete(authenticatedPage);

    await authenticatedPage.screenshot({ path: 'test-results/research_streaming_indicators.png', fullPage: true });
  });

  test('Performance benchmarks - should meet SLA targets', async ({ authenticatedPage, measurePerformance }) => {
    const queries = [
      { query: 'Quick brief on Apple', mode: 'quick', maxTTFB: 5000, maxTotal: 30000 },
      { query: 'Deep research on Amazon', mode: 'deep', maxTTFB: 10000, maxTotal: 90000 },
    ];

    const results = [];

    for (const { query, mode, maxTTFB, maxTotal } of queries) {
      const metrics = await measurePerformance(query);

      results.push({
        query,
        mode,
        ttfb: metrics.ttfb,
        totalTime: metrics.totalTime,
        contentLength: metrics.contentLength,
        ttfbPass: metrics.ttfb < maxTTFB,
        totalPass: metrics.totalTime < maxTotal,
      });

      // Verify SLA targets
      expect(metrics.ttfb, `${mode} TTFB should be <${maxTTFB}ms`).toBeLessThan(maxTTFB);
      expect(metrics.totalTime, `${mode} total time should be <${maxTotal}ms`).toBeLessThan(maxTotal);

      // Wait between queries
      await authenticatedPage.getByRole('button', { name: 'New research' }).click();
      await authenticatedPage.waitForTimeout(1000);
    }

    // Log results
    console.table(results);
  });

  test('Error handling - should handle invalid queries gracefully', async ({ authenticatedPage }) => {
    // Test with empty query
    await authenticatedPage.getByPlaceholder('Message agent...').fill('');
    const sendButton = authenticatedPage.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeDisabled();

    // Test with very short query
    await authenticatedPage.getByPlaceholder('Message agent...').fill('a');
    // Should still be able to send, but might get a clarification response
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();

    // Should get some response (not error)
    await expect(authenticatedPage.locator('[role="assistant"]').last()).toBeVisible({ timeout: 30000 });

    await authenticatedPage.screenshot({ path: 'test-results/research_error_handling.png', fullPage: true });
  });

  test('Context preservation - should remember previous research in conversation', async ({ authenticatedPage }) => {
    // First research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Slack');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Follow-up that requires context
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Compare them to Microsoft Teams');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Response should mention both Slack and Teams
    const content = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    expect(content).toContain('Slack');
    expect(content).toContain('Teams');

    await authenticatedPage.screenshot({ path: 'test-results/research_context_preservation.png', fullPage: true });
  });
});
