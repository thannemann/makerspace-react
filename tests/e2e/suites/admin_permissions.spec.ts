import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { MemberPage } from '../pages/MemberPage';
import { adminMember } from '../fixtures/testData';

// ── Admin permission management ───────────────────────────────────────────────
//
// Verifies admin can view and toggle member permissions.
// Uses basic_member12 — not shared with other suites.

const TARGET_EMAIL = 'basic_member12@test.com';
const TARGET_NAME  = 'Basic Member12';

test.describe('Admin manages member permissions', () => {

  test('Admin can view permissions tab on member profile', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await member.goToMembersList();
    await member.searchMembers('basic_member12');
    await member.clickMemberLink(TARGET_NAME);
    await member.waitForProfile();

    // Permissions tab or section should be visible on admin view
    const permissionsTab = page.getByRole('tab', { name: /permissions/i });
    if (await permissionsTab.isVisible({ timeout: 5_000 })) {
      await permissionsTab.click();
    } else {
      // Permissions may be inline on the profile — look for the section
      await page.getByRole('button', { name: /permissions/i }).click();
    }
    await page.waitForTimeout(1000);
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();

    // Should see permission toggles or checkboxes
    const permissionControls = page.getByRole('checkbox').or(page.getByRole('switch'));
    const count = await permissionControls.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Admin can toggle a permission and change persists on reload', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await member.goToMembersList();
    await member.searchMembers('basic_member12');
    await member.clickMemberLink(TARGET_NAME);
    await member.waitForProfile();

    // Navigate to permissions
    const permissionsTab = page.getByRole('tab', { name: /permissions/i });
    if (await permissionsTab.isVisible({ timeout: 5_000 })) {
      await permissionsTab.click();
    } else {
      await page.getByRole('button', { name: /permissions/i }).click();
    }
    await page.waitForTimeout(1000);

    // Find the first permission checkbox and read its current state
    const firstPermission = page.getByRole('checkbox').first();
    await firstPermission.waitFor({ state: 'visible', timeout: 10_000 });
    const wasChecked = await firstPermission.isChecked();

    // Toggle it
    await firstPermission.click();
    await page.waitForTimeout(1000);

    // Verify state changed
    const isCheckedAfter = await firstPermission.isChecked();
    expect(isCheckedAfter).toBe(!wasChecked);

    // Reload and verify it persisted
    await member.reloadProfile();
    const permissionsTabReload = page.getByRole('tab', { name: /permissions/i });
    if (await permissionsTabReload.isVisible({ timeout: 5_000 })) {
      await permissionsTabReload.click();
    } else {
      await page.getByRole('button', { name: /permissions/i }).click();
    }
    await page.waitForTimeout(1000);

    const firstPermissionReloaded = page.getByRole('checkbox').first();
    await firstPermissionReloaded.waitFor({ state: 'visible', timeout: 10_000 });
    const isCheckedAfterReload = await firstPermissionReloaded.isChecked();
    expect(isCheckedAfterReload).toBe(!wasChecked);

    // Restore original state
    await firstPermissionReloaded.click();
    await page.waitForTimeout(1000);
  });
});
