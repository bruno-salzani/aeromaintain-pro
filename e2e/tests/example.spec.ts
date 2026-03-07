import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/AeroMaintain/);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  
  // Expect to see a login form or button
  // Adjust selector based on actual implementation
  await expect(page.locator('text=Entrar')).toBeVisible();
});
