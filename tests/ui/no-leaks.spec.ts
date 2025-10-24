import { test, expect, waitForStreamComplete, hasApiError } from '../fixtures';

function findSnakeCase(text: string): string[] {
  const allowlist = new Set([
    'access_token', 'sb_auth_token', 'supabase', 'next_actions', 'user_id', 'chat_id', 'api_key'
  ]);
  const matches = text.match(/\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/g) || [];
  return matches.filter(m => !allowlist.has(m.toLowerCase()));
}

function findJsonish(text: string): string[] {
  const hits: string[] = [];
  const keyColon = text.match(/\"[a-zA-Z0-9_]+\"\s*:/g) || [];
  hits.push(...keyColon.map(s => s.replace(/\s*:/, '')));
  if (/\{\s*\"/.test(text)) hits.push('{"');
  return hits;
}

test.describe('No Computer-Optimized Text Leaks', () => {
  test('assistant and research output contain natural language only @smoke', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await Promise.race([
      authenticatedPage.getByRole('button', { name: /New Chat|New research/i }).waitFor({ timeout: 15000 }),
      authenticatedPage.getByTestId('chat-surface').first().waitFor({ timeout: 15000 }),
    ]);
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Cloudflare with full output');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);
    if (await hasApiError(authenticatedPage)) test.skip(true, 'API error encountered during smoke');

    await authenticatedPage.locator('[data-testid="message-assistant"]').last().waitFor({ timeout: 60000 });
    const assistantText = (await authenticatedPage.locator('[data-testid="message-assistant"]').last().textContent()) || '';
    const snakeAssistant = findSnakeCase(assistantText);
    const jsonAssistant = findJsonish(assistantText);
    expect(snakeAssistant.length + jsonAssistant.length < 3).toBeTruthy();

    // Research output sections if rendered
    const output = authenticatedPage.getByTestId('research-output');
    if (await output.isVisible().catch(() => false)) {
      const text = (await output.textContent()) || '';
      const snake = findSnakeCase(text);
      const json = findJsonish(text);
      expect(snake.length + json.length < 3).toBeTruthy();
    }
  });
});
