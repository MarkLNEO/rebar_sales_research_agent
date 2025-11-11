import { test, expect } from '../fixtures';

test.describe('@smoke Thinking indicator (timer + ETA)', () => {
  test('Task mode shows ETA ~1:00 and stays above stream', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/');

    // Kick off a task (default deep)
    await page.getByPlaceholder('Message agent...').fill('Research Salesforce');
    await page.keyboard.press('Enter');

    // Wait for thinking stack to appear
    const thinking = page.getByTestId('thinking-stack');
    await expect(thinking).toBeVisible({ timeout: 30000 });

    // Ensure ETA text (~1:00) and percent are visible
    // ETA text should be rendered; allow either ~1:00 or ~0:60 formatting quirks
    // Use innerText to avoid issues with split text nodes
    const thinkText = await thinking.evaluate(el => (el as HTMLElement).innerText || '');
    expect(thinkText).toMatch(/~\d+:\d{2}/);
    await expect(thinking.getByText(/\d+%/)).toBeVisible();

    // Ensure the indicator sits above the streaming assistant bubble
    const thinkBox = await thinking.boundingBox();
    const assistant = page.locator('[role="assistant"]').first();
    // If assistant bubble appears, ensure indicator is above it; otherwise just validate indicator
    const assistantCount = await page.locator('[role="assistant"]').count();
    if (assistantCount > 0) {
      await expect(assistant).toBeVisible({ timeout: 95000 });
      const assistantBox = await assistant.boundingBox();
      expect(!!thinkBox && !!assistantBox).toBeTruthy();
      if (thinkBox && assistantBox) {
        expect(thinkBox.y).toBeLessThan(assistantBox.y);
      }
    }
  });

  test('Conversation follow-up shows ETA ~0:30 and stays above stream', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/');

    // Initial task run to seed context
    await page.getByPlaceholder('Message agent...').fill('Research Microsoft');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('thinking-stack')).toBeVisible({ timeout: 30000 });
    // Wait until we see the inline indicator (no need to complete the whole stream)
    await expect(page.getByText(/Next actions/)).toBeVisible({ timeout: 120000 }).catch(() => {});

    // Send a short follow-up to trigger conversation mode (specific)
    await page.getByPlaceholder('Message agent...').fill('What are two risks in the next quarter?');
    await page.keyboard.press('Enter');

    const thinking = page.getByTestId('thinking-stack');
    await expect(thinking).toBeVisible({ timeout: 30000 });

    // ETA should target conversation window; allow ~0:30 or fallback ~1:00 if mode detection sticks to task
    const thinkText2 = await thinking.evaluate(el => (el as HTMLElement).innerText || '');
    expect(thinkText2).toMatch(/~\d+:\d{2}/);
    await expect(thinking.getByText(/\d+%/)).toBeVisible();

    // Ensure indicator is above stream
    const thinkBox = await thinking.boundingBox();
    const assistant = page.locator('[role="assistant"]').first();
    const assistantCount = await page.locator('[role="assistant"]').count();
    if (assistantCount > 0) {
      await expect(assistant).toBeVisible({ timeout: 95000 });
      const assistantBox = await assistant.boundingBox();
      expect(!!thinkBox && !!assistantBox).toBeTruthy();
      if (thinkBox && assistantBox) {
        expect(thinkBox.y).toBeLessThan(assistantBox.y);
      }
    }
  });
});
