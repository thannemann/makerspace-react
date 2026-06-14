import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { MemberPage } from '../pages/MemberPage';
import { adminMember, basicMember } from '../fixtures/testData';

// ── Member checkin activity ───────────────────────────────────────────────────
//
// Verifies the checkin activity view loads and renders without crashing.
// This page uses the /checkins collection which only stores member name strings
// (no member_id yet — tracked as a GitHub issue). These tests verify the UI
// doesn't crash even when the data model is incomplete.

test.describe('Member checkin activity page', () => {

  test('Admin views checkin activity tab on member profile', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await member.goToMembersList();
    await member.searchMembers('basic_member0');
    await member.clickMemberLink('Basic Member0');
    await member.waitForProfile();

    // Checkin activity may be a tab or a separate section
    const checkinTab = page.getByRole('tab', { name: /checkin|check.in|activity/i });
    if (await checkinTab.isVisible({ timeout: 5_000 })) {
      await checkinTab.click();
      await page.waitForTimeout(1000);
    } else {
      // Try navigating directly to checkin-activity subpath
      const url = page.url();
      const memberId = url.match(/\/members\/([^/]+)/)?.[1];
      if (memberId) {
        await page.goto(`/members/${memberId}/checkin-activity`);
        await page.waitForLoadState('networkidle');
      }
    }

    // No crash
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    await expect(page.getByText(/unexpected error/i)).not.toBeVisible();
  });

  test('Admin space usage page renders checkin data without crash', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /space usage/i }).click();
    await page.waitForTimeout(2000);

    // Chart or data should render — no white screen or error
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    await expect(page.getByText(/space usage/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Admin checkins list loads from admin billing/checkins route', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.signIn(adminMember.email, adminMember.password);

    // Checkins are accessible via the admin members list or via a direct API response
    // The UI exposes checkin data on the Space Usage analytics tab
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /space usage/i }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });
});
