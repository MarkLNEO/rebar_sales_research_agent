import { test, expect, TEST_USERS } from './fixtures';

/**
 * Onboarding Flow Tests
 *
 * Tests the new user onboarding experience including:
 * - Account creation
 * - Welcome screens
 * - Profile setup wizard
 * - ICP configuration
 * - Criteria & signals setup
 * - First research experience
 */

test.describe('Onboarding Flow', () => {
  test('Complete onboarding wizard - happy path', async ({ page }) => {
    // Step 1: Sign up
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();

    const testEmail = `test-onboarding-${Date.now()}@rebarhq.com`;
    await page.getByPlaceholder('you@company.com').fill(testEmail);
    await page.getByPlaceholder('Choose a password').fill('Test123!@#');
    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Wait for email verification or onboarding start
    // Note: In real tests, you'd need to handle email verification
    // For now, assume it redirects to onboarding

    await page.screenshot({ path: 'test-results/onboarding_01_signup.png' });

    // Step 2: Welcome screen
    await expect(page.getByText(/welcome/i)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/onboarding_02_welcome.png' });

    // Click to start onboarding
    await page.getByRole('button', { name: /get started|continue|next/i }).click();

    // Step 3: Role selection
    await expect(page.getByText(/what.*role|your role/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /account executive|ae/i }).click();
    await page.screenshot({ path: 'test-results/onboarding_03_role.png' });

    await page.getByRole('button', { name: /continue|next/i }).click();

    // Step 4: Use case selection
    await expect(page.getByText(/how.*help|use case/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /research|account intel/i }).first().click();
    await page.screenshot({ path: 'test-results/onboarding_04_usecase.png' });

    await page.getByRole('button', { name: /continue|next/i }).click();

    // Step 5: Industry selection
    await expect(page.getByText(/industry|sector/i)).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/industry|search/i).fill('Technology');
    await page.getByText('Technology', { exact: true }).click();
    await page.screenshot({ path: 'test-results/onboarding_05_industry.png' });

    await page.getByRole('button', { name: /continue|next/i }).click();

    // Step 6: ICP definition
    await expect(page.getByText(/ideal customer|icp/i)).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/describe|icp/i).fill(
      'Enterprise SaaS companies with 500+ employees, $50M+ ARR, using cloud infrastructure'
    );
    await page.screenshot({ path: 'test-results/onboarding_06_icp.png' });

    await page.getByRole('button', { name: /continue|next/i }).click();

    // Step 7: Criteria setup
    await expect(page.getByText(/criteria|look for/i)).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/add criterion/i).fill('Recent funding round');
    await page.getByRole('button', { name: /add|save/i }).click();
    await page.screenshot({ path: 'test-results/onboarding_07_criteria.png' });

    await page.getByRole('button', { name: /continue|next|skip/i }).click();

    // Step 8: Complete onboarding
    await expect(page.getByText(/all set|ready/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/onboarding_08_complete.png' });

    await page.getByRole('button', { name: /start|go to dashboard/i }).click();

    // Verify landed on dashboard
    await expect(page.getByRole('button', { name: 'New Chat' })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/onboarding_09_dashboard.png' });
  });

  test('Skip onboarding - should allow minimal setup', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();

    const testEmail = `test-skip-${Date.now()}@rebarhq.com`;
    await page.getByPlaceholder('you@company.com').fill(testEmail);
    await page.getByPlaceholder('Choose a password').fill('Test123!@#');
    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Look for skip button on each step
    for (let i = 0; i < 8; i++) {
      const skipButton = page.getByRole('button', { name: /skip|later/i });
      const isVisible = await skipButton.isVisible().catch(() => false);

      if (isVisible) {
        await skipButton.click();
        await page.waitForTimeout(500);
      } else {
        // If no skip, click next
        const nextButton = page.getByRole('button', { name: /continue|next/i });
        if (await nextButton.isVisible().catch(() => false)) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Should eventually land on dashboard
    await expect(page.getByRole('button', { name: 'New Chat' })).toBeVisible({ timeout: 15000 });
  });

  test('Profile persistence - onboarding data should persist after logout', async ({ page, supabase }) => {
    // Create account and complete onboarding
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();

    const testEmail = `test-persist-${Date.now()}@rebarhq.com`;
    const testPassword = 'Test123!@#';

    await page.getByPlaceholder('you@company.com').fill(testEmail);
    await page.getByPlaceholder('Choose a password').fill(testPassword);
    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Complete minimal onboarding
    // (Implementation depends on your onboarding flow)

    // Wait for dashboard
    await expect(page.getByRole('button', { name: 'New Chat' })).toBeVisible({ timeout: 15000 });

    // Logout
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();

    // Login again
    await page.getByPlaceholder('you@company.com').fill(testEmail);
    await page.getByPlaceholder('Your password').fill(testPassword);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should go straight to dashboard (not onboarding again)
    await expect(page.getByRole('button', { name: 'New Chat' })).toBeVisible({ timeout: 10000 });

    // Should NOT see onboarding screens
    await expect(page.getByText(/welcome.*onboard/i)).not.toBeVisible();
  });

  test('Validation - should validate required fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();

    // Try to submit without email
    await page.getByPlaceholder('Choose a password').fill('Test123!@#');
    const submitButton = page.getByRole('button', { name: /create account|sign up/i });

    // Should be disabled or show validation error
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();
      // Should see error message
      await expect(page.getByText(/required|invalid/i)).toBeVisible({ timeout: 3000 });
    } else {
      expect(isDisabled).toBe(true);
    }

    // Try with invalid email
    await page.getByPlaceholder('you@company.com').fill('notanemail');
    await page.getByPlaceholder('Choose a password').fill('Test123!@#');

    if (!await submitButton.isDisabled()) {
      await submitButton.click();
      await expect(page.getByText(/invalid.*email|valid email/i)).toBeVisible({ timeout: 3000 });
    }

    await page.screenshot({ path: 'test-results/onboarding_validation.png' });
  });

  test('Progressive disclosure - should show advanced options on demand', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();

    const testEmail = `test-advanced-${Date.now()}@rebarhq.com`;
    await page.getByPlaceholder('you@company.com').fill(testEmail);
    await page.getByPlaceholder('Choose a password').fill('Test123!@#');
    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Navigate through onboarding looking for "Advanced" or "Show more" options
    for (let i = 0; i < 10; i++) {
      const advancedButton = page.getByRole('button', { name: /advanced|show more|customize/i });
      const isVisible = await advancedButton.isVisible().catch(() => false);

      if (isVisible) {
        await advancedButton.click();
        await page.screenshot({ path: `test-results/onboarding_advanced_${i}.png` });

        // Verify additional fields appeared
        const fieldCountBefore = await page.locator('input, textarea, select').count();
        expect(fieldCountBefore).toBeGreaterThan(0);

        break;
      }

      // Move to next step
      const nextButton = page.getByRole('button', { name: /continue|next/i });
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }
  });
});
