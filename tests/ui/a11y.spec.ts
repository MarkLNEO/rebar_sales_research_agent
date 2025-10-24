import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures';

test.describe('Accessibility', () => {
  test.skip(process.env.STRICT_A11Y !== '1', 'A11y checks are non-blocking unless STRICT_A11Y=1');
  test('home view has no critical violations @smoke', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    // Ensure app UI is ready
    await Promise.race([
      authenticatedPage.getByRole('button', { name: /New Chat|New research/i }).waitFor({ timeout: 15000 }),
      authenticatedPage.getByTestId('chat-surface').first().waitFor({ timeout: 15000 }),
    ]);
    const chatSurface = authenticatedPage.getByTestId('chat-surface');
    await expect(chatSurface.first()).toBeVisible({ timeout: 15000 });

    const results = await new AxeBuilder({ page: authenticatedPage }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    if (process.env.STRICT_A11Y === '1') {
      expect(critical, `Critical a11y issues: ${critical.map(v => v.id).join(', ')}`).toEqual([]);
    } else if (critical.length) {
      console.warn('A11y (non-blocking) critical issues:', critical.map(v => v.id).join(', '));
      expect.soft(critical.length).toBe(0);
    }
  });
});
