// QA – Public pages smoke tests (run in browser via Playwright).
// Run: npx playwright test tests/qa-public-pages.spec.js
// Run all: npx playwright test

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows main content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    // Navbar / CTA
    await expect(page.getByRole('link', { name: /goodlink|Login|Sign/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('has link to login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Login|Sign in/i }).first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Terms page', () => {
  test('loads and shows terms content', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveURL(/\/terms/);
    await expect(page.getByText(/Terms of Service|goodlink/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Privacy page', () => {
  test('loads and shows privacy content', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByText(/Privacy|goodlink/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Contact page', () => {
  test('loads and shows contact form or heading', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveURL(/\/contact/);
    await expect(
      page.getByRole('heading', { name: /Contact|Get in touch/i }).or(page.getByPlaceholder(/email|message/i).first())
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Navigation from homepage', () => {
  test('can open login from home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Login|Sign in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible({ timeout: 5000 });
  });
});
