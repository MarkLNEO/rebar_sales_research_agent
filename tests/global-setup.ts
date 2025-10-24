import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const email = process.env.TEST_USER_EMAIL || 'cliff.test@nevereverordinary.com';
  const password = process.env.TEST_USER_PASSWORD || 'Test123!@#';

  const storageDir = path.join('playwright', '.auth');
  const storageFile = path.join(storageDir, 'user.json');

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    // If already authenticated (from a previous run), we can save state as-is
    const signedIn = await page.getByRole('button', { name: /sign out/i }).isVisible().catch(() => false);
    if (!signedIn) {
      try {
        const emailField = page.getByPlaceholder('you@company.com');
        const hasEmailField = await emailField.isVisible({ timeout: 10000 }).catch(() => false);
        if (hasEmailField) {
          await emailField.fill(email);
          await page.locator('input[type="password"], input[placeholder="Your password"]').fill(password);
          await page.getByRole('button', { name: /sign in|log in/i }).click();
          await page.waitForLoadState('domcontentloaded');
        }

        // Dismiss potential welcome modal by typing 'skip'
        const welcomeInput = page.getByPlaceholder(/Research.*or.*Help me set up/i);
        if (await welcomeInput.isVisible().catch(() => false)) {
          await welcomeInput.fill('skip');
          await welcomeInput.press('Enter');
        }

        // Wait for either New Chat or just proceed after a short delay
        const newChat = page.getByRole('button', { name: /new chat/i });
        await Promise.race([
          newChat.waitFor({ timeout: 10000 }).catch(() => undefined),
          page.waitForTimeout(3000),
        ]);
      } catch (e) {
        console.warn('[global-setup] Login skipped due to missing UI or timeout:', (e as Error)?.message);
      }
    }

    await context.storageState({ path: storageFile });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
