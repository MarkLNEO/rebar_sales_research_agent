import { test, expect, assertNoApiError } from '../fixtures';

test.describe('@smoke No UI/API errors', () => {
  test('Happy-path research has no error toasts/banners', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/');

    // Kick off a simple research to exercise the main flow
    await page.getByPlaceholder('Message agent...').fill('Research Adobe');
    await page.keyboard.press('Enter');

    // Wait for the stream to complete (or at least the action bar sentinel)
    await expect(page.getByText(/Next actions/i)).toBeVisible({ timeout: 120000 });

    // Assert no error banners/toasts are present
    await assertNoApiError(page);
  });
});

