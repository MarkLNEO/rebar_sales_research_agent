import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('home view has no critical violations @smoke', async ({ page }) => {
    await page.goto('/');
    // If authenticated, ensure main chat surface is visible
    const chatSurface = page.getByTestId('chat-surface');
    await expect(chatSurface.first()).toBeVisible({ timeout: 10000 });

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Critical a11y issues: ${critical.map(v => v.id).join(', ')}`).toEqual([]);
  });
});

