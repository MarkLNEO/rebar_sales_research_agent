import { test, expect } from '../fixtures';

test.describe('@smoke Term disambiguation', () => {
  test('URL/domain terms do not render confirm chip', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Start a fresh session
    await page.goto('/');

    // Ask to research a domain-like term
    await page.getByPlaceholder('Message agent...').fill('Research gartner.com');
    await page.keyboard.press('Enter');

    // Wait for completion
    await expect(page.getByText('Next actions')).toBeVisible({ timeout: 120000 });

    // The confirm chip should NOT be present for URL-like terms
    const chipVisible = await page
      .getByText(/Confirm term meaning\?/i)
      .isVisible()
      .catch(() => false);
    expect(chipVisible).toBeFalsy();
  });

  test('Confirm chip (if present) dismisses after confirming', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Try to elicit a clarification scenario with an ambiguous token
    await page.goto('/');
    await page.getByPlaceholder('Message agent...').fill('Research ACME and clarify ambiguous terms');
    await page.keyboard.press('Enter');

    // Wait for completion
    await expect(page.getByText('Next actions')).toBeVisible({ timeout: 120000 });

    // If a confirm chip is present, click Confirm and verify it disappears
    const chip = page.getByText(/Confirm term meaning\?/i);
    const chipIsVisible = await chip.isVisible().catch(() => false);
    if (chipIsVisible) {
      const confirmBtn = page.getByRole('button', { name: /^Confirm$/i }).first();
      await confirmBtn.click();
      // The chip should disappear shortly after a successful save
      await expect(chip).toBeHidden({ timeout: 5000 });
    } else {
      test.skip(true, 'No term mapping chip rendered for this run');
    }
  });
});

