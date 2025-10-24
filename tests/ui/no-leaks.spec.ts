import { test, expect } from '@playwright/test';
import { waitForStreamComplete } from '../fixtures';

function hasSnakeCaseLeak(text: string): boolean {
  // words_like_this or keys_like_this: 5+ letters total with underscore
  return /\b[a-z]{2,}_[a-z0-9_]{2,}\b/.test(text);
}

function hasJsonLeak(text: string): boolean {
  // rudimentary detection of JSON-ish leakage
  return /"[a-z0-9_]+"\s*:\s*\S/.test(text) || /\{\s*"/.test(text);
}

test.describe('No Computer-Optimized Text Leaks', () => {
  test('assistant and research output contain natural language only @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Message agent...').fill('Research Cloudflare with full output');
    await page.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(page);

    const assistantText = (await page.locator('[data-testid="message-assistant"]').last().textContent()) || '';
    expect(hasSnakeCaseLeak(assistantText)).toBeFalsy();
    expect(hasJsonLeak(assistantText)).toBeFalsy();

    // Research output sections if rendered
    const output = page.getByTestId('research-output');
    if (await output.isVisible().catch(() => false)) {
      const text = (await output.textContent()) || '';
      expect(hasSnakeCaseLeak(text)).toBeFalsy();
      expect(hasJsonLeak(text)).toBeFalsy();
    }
  });
});

