import { test, expect, waitForStreamComplete } from './fixtures';

/**
 * Preference Persistence & Learning Tests
 *
 * Tests that user preferences are:
 * - Tracked implicitly from behavior
 * - Persisted across sessions
 * - Applied to future requests
 * - Overridable by explicit choices
 */

test.describe('Preference Persistence', () => {
  test('Research mode preference - should remember last used mode', async ({ authenticatedPage, clearData }) => {
    // Clear any existing preferences
    await clearData();

    // First research: use Quick mode
    await authenticatedPage.goto('/');
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Quick brief on Netflix');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Verify Quick mode is active
    await expect(authenticatedPage.getByRole('button', { name: 'Quick' })).toHaveClass(/border-blue-500|bg-blue/);

    // Start new chat
    await authenticatedPage.getByRole('button', { name: 'New Chat' }).click();

    // Second research: should default to Quick mode
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Disney');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should still be in Quick mode (preference remembered)
    await expect(authenticatedPage.getByRole('button', { name: 'Quick' })).toHaveClass(/border-blue-500|bg-blue/);

    await authenticatedPage.screenshot({ path: 'test-results/pref_mode_persistence.png' });
  });

  test('Mode preference across sessions - should persist after logout', async ({ page, testUser, clearData }) => {
    await clearData();

    // Login
    await page.goto('/');
    await page.getByPlaceholder('you@company.com').fill(testUser.email);
    await page.getByPlaceholder('Your password').fill(testUser.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Use Deep mode several times to establish preference
    for (let i = 0; i < 3; i++) {
      await page.getByPlaceholder('Message agent...').fill(`Research Company ${i+1}`);
      await page.getByRole('button', { name: 'Send message' }).click();
      await waitForStreamComplete(page);

      // Ensure Deep mode is selected
      await page.getByRole('button', { name: 'Deep' }).click();
      await waitForStreamComplete(page);

      await page.getByRole('button', { name: 'New research' }).click();
      await page.waitForTimeout(500);
    }

    // Logout
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();

    // Login again
    await page.getByPlaceholder('you@company.com').fill(testUser.email);
    await page.getByPlaceholder('Your password').fill(testUser.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Do new research - should default to Deep mode
    await page.getByPlaceholder('Message agent...').fill('Research Tesla');
    await page.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(page);

    // Verify Deep mode is active
    await expect(page.getByRole('button', { name: 'Deep' })).toHaveClass(/border-blue-500|bg-blue/);
  });

  test('Explicit vs implicit preferences - explicit should override implicit', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Establish implicit preference for Quick (use it 3 times)
    for (let i = 0; i < 3; i++) {
      await authenticatedPage.getByPlaceholder('Message agent...').fill(`quick brief on company ${i+1}`);
      await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
      await waitForStreamComplete(authenticatedPage);

      await authenticatedPage.getByRole('button', { name: 'New research' }).click();
      await authenticatedPage.waitForTimeout(500);
    }

    // Now explicitly select Deep mode
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Amazon');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Click Deep mode button
    await authenticatedPage.getByRole('button', { name: 'Deep' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Confirm preference save
    const confirmButton = authenticatedPage.getByRole('button', { name: /save|confirm|remember/i });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }

    // New research should use Deep (explicit overrides implicit)
    await authenticatedPage.getByRole('button', { name: 'New research' }).click();
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Google');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    await expect(authenticatedPage.getByRole('button', { name: 'Deep' })).toHaveClass(/border-blue-500|bg-blue/);
  });

  test('Research count tracking - should increment correctly', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Check initial research count in localStorage
    const initialCount = await authenticatedPage.evaluate(() => {
      return Number(localStorage.getItem('research_count') || '0');
    });

    // Do 3 research queries
    for (let i = 0; i < 3; i++) {
      await authenticatedPage.getByPlaceholder('Message agent...').fill(`Research company ${i+1}`);
      await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
      await waitForStreamComplete(authenticatedPage);

      await authenticatedPage.getByRole('button', { name: 'New research' }).click();
      await authenticatedPage.waitForTimeout(500);
    }

    // Check final count
    const finalCount = await authenticatedPage.evaluate(() => {
      return Number(localStorage.getItem('research_count') || '0');
    });

    expect(finalCount).toBe(initialCount + 3);
  });

  test('JIT prompts - should trigger at milestones', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Do first research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Salesforce');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should see suggestion to track account (after 1st research)
    const trackSuggestion = authenticatedPage.getByText(/track.*account|save.*account/i);
    await expect(trackSuggestion).toBeVisible({ timeout: 5000 });

    await authenticatedPage.screenshot({ path: 'test-results/pref_jit_milestone_1.png' });
  });

  test('Preference UI indicators - should show learned preferences', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Look for preference badges or indicators
    const prefIndicators = [
      authenticatedPage.getByText(/focus:/i),
      authenticatedPage.getByText(/depth:/i),
      authenticatedPage.getByText(/tone:/i),
    ];

    // At least one should be visible
    const visibleCount = await Promise.all(
      prefIndicators.map(ind => ind.isVisible().catch(() => false))
    ).then(results => results.filter(Boolean).length);

    expect(visibleCount).toBeGreaterThan(0);

    await authenticatedPage.screenshot({ path: 'test-results/pref_ui_indicators.png' });
  });

  test('Preference signal tracking - should send signals to backend', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Listen for preference API calls
    const preferenceUpdates: string[] = [];

    authenticatedPage.on('request', (request) => {
      if (request.url().includes('/api/preferences') || request.url().includes('/api/profiles/update')) {
        preferenceUpdates.push(request.url());
      }
    });

    // Do research and interact
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Quick brief on Apple');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Click a mode button to trigger preference save
    await authenticatedPage.getByRole('button', { name: 'Deep' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should have made at least one preference update call
    expect(preferenceUpdates.length).toBeGreaterThan(0);

    console.log('Preference updates:', preferenceUpdates);
  });

  test('Profile Coach preferences - should apply and persist', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Open Profile Coach
    await authenticatedPage.getByRole('button', { name: 'Profile Coach' }).click();
    await expect(authenticatedPage.getByText(/profile|setup|preferences/i)).toBeVisible();

    // Make a preference change
    const outputBrevityOption = authenticatedPage.getByRole('button', { name: /concise|brief|short/i });
    if (await outputBrevityOption.isVisible().catch(() => false)) {
      await outputBrevityOption.click();

      // Confirm or save
      const saveButton = authenticatedPage.getByRole('button', { name: /save|apply/i });
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
      }
    }

    // Go back to research
    await authenticatedPage.getByRole('button', { name: /home|chat|research/i }).click();

    // Do research - should apply the preference
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Microsoft');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Output should be concise (if that preference was set)
    const content = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const wordCount = (content?.length || 0) / 5;

    // If brief preference was set, output should be shorter
    // (This is approximate - exact behavior depends on implementation)
    expect(wordCount).toBeLessThan(1500);

    await authenticatedPage.screenshot({ path: 'test-results/pref_profile_coach.png' });
  });
});
