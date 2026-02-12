// QA – Auth page validations (run in browser via Playwright).
// Run: npx playwright test
// Run with UI: npx playwright test --ui

import { test, expect } from '@playwright/test';

test.describe('Auth page – Login validations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows error or blocks submit when login with empty email and password', async ({ page }) => {
    await page.getByRole('button', { name: /Sign In/i }).click();
    // Either HTML5 validation (stay on page, no redirect) or Supabase/error message
    await page.waitForTimeout(1500);
    const stillOnLogin = await page.getByRole('button', { name: /Sign In/i }).isVisible();
    const hasError = await page.locator('[class*="red-500"]').filter({ hasText: /.+/ }).isVisible();
    expect(stillOnLogin || hasError).toBeTruthy();
  });

  test('invalid credentials do not navigate to dashboard', async ({ page }) => {
    await page.getByPlaceholder('name@example.com').first().fill('not-an-email');
    await page.getByPlaceholder('••••••••').first().fill('SomePass1');
    await page.getByRole('button', { name: /Sign In/i }).click();
    // Should stay on login (no redirect); error message may vary by Supabase/locale
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible({ timeout: 15000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('shows error for wrong password on login', async ({ page }) => {
    await page.getByPlaceholder('name@example.com').first().fill('test@example.com');
    await page.getByPlaceholder('••••••••').first().fill('WrongPassword1');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByText(/invalid|credentials|error/i)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Auth page – Signup tab (client-side validation)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Create one for free/i }).click();
  });

  test('signup form shows Full Name, Email, Password, Confirm Password fields', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
    await expect(page.getByPlaceholder('••••••••').nth(1)).toBeVisible();
  });

  test('Create Account button is present (disabled until Turnstile in real app)', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Create Account/i });
    await expect(btn).toBeVisible();
    // Button is disabled without Turnstile token
    await expect(btn).toBeDisabled();
  });
});

test.describe('Auth page – Forgot password validations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Forgot\?/i }).click();
  });

  test('forgot password view shows email field and submit', async ({ page }) => {
    await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Link/i })).toBeVisible();
  });

  test('invalid email on forgot password shows validation error', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Reset Password/i })).toBeVisible({ timeout: 3000 });
    await page.getByPlaceholder('name@example.com').fill('bad-email');
    await page.getByRole('button', { name: /Send Link/i }).click();
    // Exact message from AuthPage.jsx validation
    await expect(page.getByText('Please enter a valid email address (e.g. name@example.com)')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth page – navigation', () => {
  test('can switch from Login to Sign up and back', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    await page.getByRole('button', { name: /Create one for free/i }).click();
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });
});
