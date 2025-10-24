import { test, expect, waitForStreamComplete } from './fixtures';

/**
 * Memory & Context Tests
 *
 * Tests conversation memory and context awareness:
 * - Context preservation across messages
 * - Reference to previous research
 * - Follow-up questions
 * - Session continuity
 * - Context window management
 */

test.describe('Memory & Context - Conversation Continuity', () => {
  test('TC-MEM-000: Persists memory across 4 turns @smoke', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Turn 1
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Datadog');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Turn 2 (follow-up)
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What is their main product focus?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Turn 3 (pronoun reference)
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Who is their CTO?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Turn 4 (topic continuity)
    await authenticatedPage.getByPlaceholder('Message agent...').fill('And what is their revenue model?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    const last = (await authenticatedPage.locator('[role="assistant"]').last().textContent())?.toLowerCase() || '';
    // Assert that context (Datadog) persists and reply relates sensibly
    expect(last).toMatch(/datadog|monitoring|observability|apm|logs/);
    // Should not confuse with unrelated prior companies
    expect(last).not.toMatch(/salesforce|oracle|microsoft/);
  });
  test('TC-MEM-004: Should maintain company context for role-based queries', async ({ authenticatedPage, clearData }) => {
    // Clear all user data including knowledge_entries and implicit_preferences
    await clearData();
    await authenticatedPage.goto('/');

    // Step 1: Research Adobe
    console.log('Step 1: Researching Adobe...');
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Adobe');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();

    // Wait for response to appear (more robust than waiting for "Next actions")
    await authenticatedPage.waitForTimeout(3000); // Let message send
    await authenticatedPage.waitForSelector('[role="assistant"]', { timeout: 60000 });

    // Wait for streaming to complete by checking if "Stop" button disappears
    await authenticatedPage.getByRole('button', { name: 'Stop' }).waitFor({ state: 'hidden', timeout: 120000 });
    await authenticatedPage.waitForTimeout(2000); // Let UI settle
    await authenticatedPage.screenshot({ path: 'test-results/tc-mem-004-step1.png' });
    console.log('✓ Step 1 complete');

    // Step 2: Ask about CEO
    console.log('Step 2: Asking about CEO...');
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Tell me more about the CEO');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await authenticatedPage.waitForTimeout(3000);

    // Wait for Stop button to disappear (streaming complete)
    await authenticatedPage.getByRole('button', { name: 'Stop' }).waitFor({ state: 'hidden', timeout: 120000 });
    await authenticatedPage.waitForTimeout(2000);

    const ceoResponse = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    await authenticatedPage.screenshot({ path: 'test-results/tc-mem-004-step2-ceo.png' });
    console.log('✓ Step 2 complete');

    // Verify CEO response mentions Adobe and Shantanu Narayen
    expect(ceoResponse?.toLowerCase()).toMatch(/adobe|shantanu|narayen/);

    // Step 3: Ask about CTO
    console.log('Step 3: Asking about CTO...');
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What about the CTO?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await authenticatedPage.waitForTimeout(3000);

    await authenticatedPage.getByRole('button', { name: 'Stop' }).waitFor({ state: 'hidden', timeout: 120000 });
    await authenticatedPage.waitForTimeout(2000);

    const ctoResponse = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    await authenticatedPage.screenshot({ path: 'test-results/tc-mem-004-step3-cto.png' });
    console.log('✓ Step 3 complete');

    // Verify CTO response mentions Adobe context (not polluted with other companies)
    expect(ctoResponse?.toLowerCase()).toMatch(/adobe|cto/);
    // Should NOT mention companies from other tests
    expect(ctoResponse?.toLowerCase()).not.toMatch(/gartner|salesforce|microsoft/);

    // Step 4: Ask about CFO
    console.log('Step 4: Asking about CFO...');
    await authenticatedPage.getByPlaceholder('Message agent...').fill('And the CFO?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await authenticatedPage.waitForTimeout(3000);

    await authenticatedPage.getByRole('button', { name: 'Stop' }).waitFor({ state: 'hidden', timeout: 120000 });
    await authenticatedPage.waitForTimeout(2000);

    const cfoResponse = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    await authenticatedPage.screenshot({ path: 'test-results/tc-mem-004-step4-cfo.png' });
    console.log('✓ Step 4 complete');

    // Verify CFO response maintains Adobe context
    expect(cfoResponse?.toLowerCase()).toMatch(/adobe|cfo/);
    // Should NOT mention companies from other tests
    expect(cfoResponse?.toLowerCase()).not.toMatch(/gartner|salesforce|microsoft/);

    console.log('✅ TC-MEM-004 PASSED: All role-based queries maintained Adobe context without pollution');
  });

  test('Should remember company from previous research', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // First research about Salesforce
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Salesforce');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Follow-up question referencing "them"
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What are their main competitors?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should understand "their" refers to Salesforce
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const mentionsCompetitors = responseText?.toLowerCase().includes('microsoft') ||
                                 responseText?.toLowerCase().includes('oracle') ||
                                 responseText?.toLowerCase().includes('sap') ||
                                 responseText?.toLowerCase().includes('competitor');

    expect(mentionsCompetitors).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_context_company.png' });
  });

  test('Should maintain context across multiple messages', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Message 1: Initial research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Tell me about Tesla');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Message 2: Follow-up about products
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What products do they sell?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Message 3: Follow-up about specific product
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Tell me more about their energy products');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // All three messages should form coherent conversation
    const messages = await authenticatedPage.locator('[role="assistant"]').allTextContents();
    expect(messages.length).toBeGreaterThanOrEqual(3);

    // Last message should reference Tesla/energy context
    const lastMessage = messages[messages.length - 1].toLowerCase();
    expect(lastMessage).toMatch(/tesla|energy|powerwall|solar|battery/);

    await authenticatedPage.screenshot({ path: 'test-results/memory_multi_message.png' });
  });

  test('New chat should start fresh context', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // First chat about Apple
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Apple');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Start new chat
    await authenticatedPage.getByRole('button', { name: 'New Chat' }).click();
    await authenticatedPage.waitForTimeout(1000);

    // Ask vague question that would reference Apple if context persisted
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What are their latest products?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should ask for clarification or not assume Apple
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const asksClarification = responseText?.toLowerCase().includes('which company') ||
                              responseText?.toLowerCase().includes('who are you') ||
                              responseText?.toLowerCase().includes('clarify') ||
                              responseText?.toLowerCase().includes('specify');

    // May either ask for clarification OR default to general response (not Apple-specific)
    expect(asksClarification || !responseText?.toLowerCase().includes('apple')).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_new_chat_reset.png' });
  });

  test('Should handle pronouns correctly with context', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Research specific company
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Give me a brief on Netflix');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Use pronoun references
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What is their revenue?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should provide Netflix revenue
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const mentionsRevenue = responseText?.toLowerCase().includes('revenue') ||
                            responseText?.toLowerCase().includes('billion') ||
                            responseText?.toLowerCase().includes('million') ||
                            responseText?.match(/\$[\d,]+/);

    expect(mentionsRevenue).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_pronouns.png' });
  });
});

test.describe('Memory & Context - Reference Previous Research', () => {
  test('Should recall information from earlier in conversation', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Research with specific detail
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What is Google\'s main business model?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Wait a bit
    await authenticatedPage.waitForTimeout(2000);

    // Ask to recall earlier information
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What did you say about their business model earlier?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should reference advertising/search
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const recallsInfo = responseText?.toLowerCase().includes('advertising') ||
                        responseText?.toLowerCase().includes('search') ||
                        responseText?.toLowerCase().includes('mentioned') ||
                        responseText?.toLowerCase().includes('said');

    expect(recallsInfo).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_recall.png' });
  });

  test('Should maintain context when switching between topics', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Topic 1: Company A
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Amazon');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Topic 2: Company B
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Now tell me about Microsoft');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Reference both companies
    await authenticatedPage.getByPlaceholder('Message agent...').fill('How do these two companies compare in cloud services?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should mention both Amazon (AWS) and Microsoft (Azure)
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const mentionsBoth = (responseText?.toLowerCase().includes('amazon') || responseText?.toLowerCase().includes('aws')) &&
                         (responseText?.toLowerCase().includes('microsoft') || responseText?.toLowerCase().includes('azure'));

    expect(mentionsBoth).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_multi_topic.png' });
  });

  test('Should remember user preferences from conversation', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Express preference
    await authenticatedPage.getByPlaceholder('Message agent...').fill('I prefer brief summaries. Give me a quick overview of Adobe.');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Second request without stating preference
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Now tell me about Salesforce');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Second response should be brief (respecting stated preference)
    const firstResponse = await authenticatedPage.locator('[role="assistant"]').nth(0).textContent();
    const secondResponse = await authenticatedPage.locator('[role="assistant"]').nth(1).textContent();

    const secondResponseLength = secondResponse?.length || 0;
    const firstResponseLength = firstResponse?.length || 0;

    // Second should be similar length (brief) or shorter
    expect(secondResponseLength).toBeLessThan(firstResponseLength * 1.5);

    await authenticatedPage.screenshot({ path: 'test-results/memory_preferences.png' });
  });
});

test.describe('Memory & Context - Follow-up Questions', () => {
  test('Should handle comparative follow-ups', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Initial research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Zoom');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Comparative follow-up
    await authenticatedPage.getByPlaceholder('Message agent...').fill('How does this compare to Microsoft Teams?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should compare Zoom and Teams
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const isComparative = (responseText?.toLowerCase().includes('zoom') || responseText?.toLowerCase().includes('both')) &&
                          responseText?.toLowerCase().includes('teams');

    expect(isComparative).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_comparative.png' });
  });

  test('Should handle elaboration requests', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Brief research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Quick brief on Stripe');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    const firstResponseLength = (await authenticatedPage.locator('[role="assistant"]').last().textContent())?.length || 0;

    // Ask for more detail
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Tell me more about their products');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Second response should be more detailed
    const secondResponseLength = (await authenticatedPage.locator('[role="assistant"]').last().textContent())?.length || 0;

    expect(secondResponseLength).toBeGreaterThan(firstResponseLength * 0.5);

    await authenticatedPage.screenshot({ path: 'test-results/memory_elaboration.png' });
  });

  test('Should handle clarification questions', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Initial research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research HubSpot');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Clarification question
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What did you mean by "flywheel model"?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should provide explanation
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const providesExplanation = responseText && responseText.length > 100;

    expect(providesExplanation).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_clarification.png' });
  });
});

test.describe('Memory & Context - Session Persistence', () => {
  test('Chat history should persist across page refreshes', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Do research
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Shopify');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Count messages
    const messagesBefore = await authenticatedPage.locator('[role="assistant"]').count();

    // Refresh page
    await authenticatedPage.reload();
    await authenticatedPage.waitForTimeout(2000);

    // Count messages again
    const messagesAfter = await authenticatedPage.locator('[role="assistant"]').count();

    expect(messagesAfter).toBeGreaterThanOrEqual(messagesBefore);

    await authenticatedPage.screenshot({ path: 'test-results/memory_persist_refresh.png' });
  });

  test('Should load previous chat from sidebar', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // First chat
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research Square');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // New chat
    await authenticatedPage.getByRole('button', { name: 'New Chat' }).click();
    await authenticatedPage.waitForTimeout(1000);

    // Second chat
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Research PayPal');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Click on first chat in sidebar
    const firstChatLink = authenticatedPage.getByText(/square/i).first();
    if (await firstChatLink.isVisible().catch(() => false)) {
      await firstChatLink.click();
      await authenticatedPage.waitForTimeout(2000);

      // Should show Square research
      const visibleText = await authenticatedPage.locator('[role="assistant"]').first().textContent();
      expect(visibleText?.toLowerCase()).toContain('square');

      await authenticatedPage.screenshot({ path: 'test-results/memory_load_previous.png' });
    }
  });

  test('Context should persist across logout/login', async ({ page, testUser, clearData }) => {
    await clearData();

    // Login
    await page.goto('/');
    await page.getByPlaceholder('you@company.com').fill(testUser.email);
    await page.getByPlaceholder('Your password').fill(testUser.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Do research
    await page.getByPlaceholder('Message agent...').fill('Research Atlassian');
    await page.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(page);

    // Logout
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();

    // Login again
    await page.getByPlaceholder('you@company.com').fill(testUser.email);
    await page.getByPlaceholder('Your password').fill(testUser.password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForTimeout(2000);

    // Should see previous chat
    const atlassianMention = page.getByText(/atlassian/i).first();
    await expect(atlassianMention).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/memory_persist_login.png' });
  });
});

test.describe('Memory & Context - Context Window Management', () => {
  test('Should handle long conversations without context loss', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Simulate 5 message exchanges
    const companies = ['Slack', 'Discord', 'Notion', 'Airtable', 'Figma'];

    for (const company of companies) {
      await authenticatedPage.getByPlaceholder('Message agent...').fill(`Tell me about ${company}`);
      await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
      await waitForStreamComplete(authenticatedPage);
      await authenticatedPage.waitForTimeout(1000);
    }

    // Reference something from early in conversation
    await authenticatedPage.getByPlaceholder('Message agent...').fill('Earlier you mentioned Slack. How does it compare to Discord?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Should still remember Slack from beginning
    const responseText = await authenticatedPage.locator('[role="assistant"]').last().textContent();
    const remembersBoth = responseText?.toLowerCase().includes('slack') &&
                          responseText?.toLowerCase().includes('discord');

    expect(remembersBoth).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_long_conversation.png' });
  });

  test('Should summarize context when appropriate', async ({ authenticatedPage, clearData }) => {
    await clearData();
    await authenticatedPage.goto('/');

    // Multiple related questions
    await authenticatedPage.getByPlaceholder('Message agent...').fill('What does MongoDB do?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    await authenticatedPage.getByPlaceholder('Message agent...').fill('What is their pricing model?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    await authenticatedPage.getByPlaceholder('Message agent...').fill('Who are their competitors?');
    await authenticatedPage.getByRole('button', { name: 'Send message' }).click();
    await waitForStreamComplete(authenticatedPage);

    // Context should be maintained across all messages
    const allMessages = await authenticatedPage.locator('[role="assistant"]').allTextContents();
    expect(allMessages.length).toBe(3);

    // All should relate to MongoDB
    const allRelateMongoDB = allMessages.every(msg =>
      msg.toLowerCase().includes('mongo') ||
      msg.toLowerCase().includes('database') ||
      msg.toLowerCase().includes('nosql')
    );

    expect(allRelateMongoDB).toBeTruthy();

    await authenticatedPage.screenshot({ path: 'test-results/memory_context_summary.png' });
  });
});
