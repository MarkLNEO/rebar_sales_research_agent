import { expect } from '@playwright/test';
import { test, waitForStreamComplete } from '../fixtures';

test.describe('UI Regression - Chat Layout', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await expect(authenticatedPage.getByRole('button', { name: 'New Chat' })).toBeVisible();
  });

  test('reasoning indicator stays above the assistant response while streaming', async ({ authenticatedPage }) => {
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Give me a quick brief on HubSpot');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();

    const thinking = authenticatedPage.locator('[data-testid="thinking-stack"]').first();
    await expect(thinking).toBeVisible({ timeout: 20000 });

    const streamingMessage = authenticatedPage.locator('[data-testid="message-assistant"]').last();
    await expect(streamingMessage).toBeVisible({ timeout: 20000 });

    // Timer or spinner should be visible within thinking stack
    const timerOrSpinner = authenticatedPage
      .locator('[data-testid="thinking-stack"]').locator('text=/^\\d{1,2}:[0-5]\\d$/');
    const spinner = authenticatedPage
      .locator('[data-testid="thinking-stack"]').locator('.animate-spin');
    const timerVisible = await timerOrSpinner.isVisible().catch(() => false);
    const spinnerVisible = await spinner.isVisible().catch(() => false);
    expect(timerVisible || spinnerVisible).toBeTruthy();

    const thinkingHandle = await thinking.elementHandle();
    const messageHandle = await streamingMessage.elementHandle();
    if (!thinkingHandle || !messageHandle) {
      throw new Error('Failed to capture DOM handles for layout comparison');
    }

    const order = await thinkingHandle.evaluate(
      (node, other) => node.compareDocumentPosition(other),
      messageHandle,
    );

    // In the DOM, the reasoning stack must appear before the streaming assistant bubble.
    const DOCUMENT_POSITION_FOLLOWING = 4;
    expect(order & DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('next actions toolbar renders below the final assistant message', async ({ authenticatedPage }) => {
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research ServiceNow in detail');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();

    await waitForStreamComplete(authenticatedPage);

    const assistantMessage = authenticatedPage.locator('[data-testid="message-assistant"]').last();
    await expect(assistantMessage).toBeVisible();

    const nextActions = authenticatedPage.locator('section').filter({ hasText: 'Next actions' }).last();
    await expect(nextActions).toBeVisible();

    const messageHandle = await assistantMessage.elementHandle();
    const actionsHandle = await nextActions.elementHandle();
    if (!messageHandle || !actionsHandle) {
      throw new Error('Failed to capture DOM handles for layout comparison');
    }

    const order = await messageHandle.evaluate(
      (node, other) => node.compareDocumentPosition(other),
      actionsHandle,
    );

    // The "Next actions" toolbar should appear after the completed assistant response.
    const DOCUMENT_POSITION_FOLLOWING = 4;
    expect(order & DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
