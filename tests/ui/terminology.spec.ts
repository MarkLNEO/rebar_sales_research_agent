import { test, expect } from '@playwright/test';
import { waitForStreamComplete } from '../fixtures';

test.describe('Terminology Fidelity', () => {
  test('Signals section uses exact configured terms', async ({ page }) => {
    await page.goto('/');

    // Trigger research likely to render full output
    await page.getByPlaceholder('Message agent...').fill('Full research on Okta');
    await page.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(page);

    // Ensure research output is visible
    const signals = page.getByTestId('research-section-buying-signals');
    await expect(signals).toBeVisible({ timeout: 30000 });
    const text = (await signals.textContent()) || '';

    // Exact terminology checks
    expect(text).toContain('Data breach');
    expect(text).toContain('Leadership change');
    expect(text).toContain('Acquisitions');

    // Commentary presence (not just headings)
    const hasCommentary = /Data breach[\s\S]{0,50}-\s*[A-Za-z]/.test(text) ||
                          /Leadership change[\s\S]{0,50}-\s*[A-Za-z]/.test(text) ||
                          /Acquisitions[\s\S]{0,50}-\s*[A-Za-z]/.test(text);
    expect(hasCommentary).toBeTruthy();
  });
});

