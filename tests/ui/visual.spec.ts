import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('chat surface baseline @smoke', async ({ page }) => {
    await page.goto('/');
    const surface = page.getByTestId('chat-surface').first();
    await expect(surface).toBeVisible();

    // Mask dynamic areas if present
    const masks = [
      page.locator('[data-testid="header-metrics"]'),
    ];

    await expect(page).toHaveScreenshot('chat-surface.png', {
      fullPage: false,
      mask: masks,
      maxDiffPixels: 250,
    });
  });
});

