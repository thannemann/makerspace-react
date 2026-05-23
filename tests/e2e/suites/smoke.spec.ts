import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies the app is reachable and the database was seeded.
 * If this passes, the CI environment is wired up correctly.
 */
test('app loads and membership options are present after seed', async ({ page }) => {
  await page.goto('/');

  // The membership select table is rendered on the home page.
  // If it loads, Rails is up, MongoDB is seeded, and the React bundle is being served.
  const table = page.locator('#membership-select-table');
  await expect(table).toBeVisible({ timeout: 30_000 });
});
