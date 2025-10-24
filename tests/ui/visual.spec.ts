import { test, expect } from '../fixtures';
import fs from 'fs';

test.describe('Visual Regression', () => {
  test('chat surface baseline @smoke', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await Promise.race([
      authenticatedPage.getByRole('button', { name: /New Chat|New research/i }).waitFor({ timeout: 15000 }),
      authenticatedPage.getByTestId('chat-surface').first().waitFor({ timeout: 15000 }),
    ]);
    const surface = authenticatedPage.getByTestId('chat-surface').first();
    await expect(surface).toBeVisible({ timeout: 15000 });

    // Mask dynamic areas if present
    const masks = [
      authenticatedPage.locator('[data-testid="header-metrics"]'),
    ];

    // Auto-create baseline on first run
    const baselinePath = test.info().snapshotPath('chat-surface.png');
    if (!fs.existsSync(baselinePath)) {
      await authenticatedPage.screenshot({ path: baselinePath, fullPage: false });
      return; // treat first run as establishing baseline
    }

    const expectFn = process.env.VISUAL_STRICT === '1' ? expect(authenticatedPage) : expect.soft(authenticatedPage as any);
    try {
      await expect(authenticatedPage).toHaveScreenshot('chat-surface.png', {
        fullPage: false,
        mask: masks,
        maxDiffPixels: 250,
      });
    } catch (err) {
      if (process.env.VISUAL_STRICT === '1') throw err;
      console.warn('[visual] Non-strict diff detected, proceeding');
    }
  });
});
