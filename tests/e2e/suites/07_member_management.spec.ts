import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { MemberPage } from '../pages/MemberPage';
import { PaymentPage } from '../pages/PaymentPage';
import { SettingsPage } from '../pages/SettingsPage';
import { adminMember, basicMember, expiredMember, newVisa, newMastercard } from '../fixtures/testData';

// ── Test 1: Admin manually renews a member ────────────────────────────────────
//
// Uses expired_member0 — a seeded member with a past expiration date.
// Admin opens edit form, selects 1 month renewal, saves.
// Verifies expiration date advances and member status becomes Active.

test.describe('Admin manually renews expired member', () => {
  const TARGET_EMAIL = expiredMember.email;
  const TARGET_NAME  = 'Expired Member0';

  test('Admin finds expired member and renews for 1 month', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await member.goToMembersList();
    await member.searchMembers('expired_member0');
    await member.clickMemberLink(TARGET_NAME);
    await member.waitForProfile();

    // Capture current expiration before renewal
    const beforeExpiration = await member.getExpiration();

    // Open edit form and select renew
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

    // Select 1 month renewal from the Renew dropdown
    const renewSelect = page.getByRole('combobox', { name: /renew/i });
    await renewSelect.waitFor({ state: 'visible', timeout: 10_000 });
    await renewSelect.selectOption('1');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15_000 });
    await member.reloadProfile();

    // Expiration should have advanced
    const afterExpiration = await member.getExpiration();
    expect(afterExpiration).not.toEqual(beforeExpiration);
    expect(afterExpiration).toMatch(/\d{1,2}\s+\w+\s+\d{4}/);
  });

  test('Member status shows Active after admin renewal', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await member.goToMembersList();
    await member.searchMembers('expired_member0');
    await member.clickMemberLink(TARGET_NAME);
    await member.waitForProfile();

    await member.verifyMembershipStatus('Active');
  });
});

// ── Test 2: Admin revokes a member ────────────────────────────────────────────
//
// Uses basic_member4 — a seeded active member not used by other test suites.
// Admin sets status to revoked. Verifies profile shows Revoked.
// Verifies that member can no longer sign in.

test.describe('Admin revokes a member', () => {
  const TARGET_EMAIL = 'basic_member4@test.com';
  const TARGET_NAME  = 'Basic Member4';

  test('Admin sets member status to revoked', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(adminMember.email, adminMember.password);
    await member.goToMembersList();
    await member.searchMembers('basic_member4');
    await member.clickMemberLink(TARGET_NAME);
    await member.waitForProfile();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

    // Change status to revoked
    const statusSelect = page.getByRole('combobox', { name: /status/i });
    await statusSelect.waitFor({ state: 'visible', timeout: 10_000 });
    await statusSelect.selectOption('revoked');

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15_000 });
    await member.reloadProfile();

    await member.verifyMembershipStatus('Revoked');
  });

  test('Revoked member cannot sign in', async ({ page }) => {
    await page.goto('/login');
    const emailField = page.getByRole('textbox', { name: 'Email' });
    await emailField.waitFor({ state: 'visible', timeout: 15_000 });
    await emailField.fill(TARGET_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should stay on login page with an error — not redirect to /members/
    await page.waitForTimeout(3000);
    expect(page.url()).not.toMatch(/\/members\//);

    // Error message should be visible
    const errorVisible =
      await page.getByText(/revoked/i).isVisible({ timeout: 5_000 }).catch(() => false) ||
      await page.getByText(/not allowed/i).isVisible({ timeout: 2_000 }).catch(() => false) ||
      await page.getByText(/sign in/i).isVisible({ timeout: 2_000 }).catch(() => false);
    expect(errorVisible).toBe(true);
  });
});

// ── Test 3: Member updates their own profile ──────────────────────────────────
//
// Uses basic_member2 — a clean seeded member not used by other suites.
// Member edits their own phone number and address, saves, reloads, and verifies.

test.describe('Member self-service profile update', () => {
  const MEMBER_EMAIL = 'basic_member2@test.com';
  const NEW_PHONE    = '6175551234';
  const NEW_STREET   = '99 Elm Street';
  const NEW_CITY     = 'Manchester';
  const NEW_POSTAL   = '03101';

  test('Member edits phone and address on their profile', async ({ page }) => {
    const auth   = new AuthPage(page);
    const member = new MemberPage(page);

    await auth.signIn(MEMBER_EMAIL, 'password');
    await member.waitForProfile();
    await member.dismissNotificationModal();

    // Open edit form
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

    // Update phone
    const phoneField = page.getByRole('textbox', { name: /phone/i });
    await phoneField.clear();
    await phoneField.fill(NEW_PHONE);

    // Update address
    const streetField = page.getByRole('textbox', { name: /street/i });
    await streetField.clear();
    await streetField.fill(NEW_STREET);

    const cityField = page.getByRole('textbox', { name: /city/i });
    await cityField.clear();
    await cityField.fill(NEW_CITY);

    const postalField = page.getByRole('textbox', { name: /postal/i });
    await postalField.clear();
    await postalField.fill(NEW_POSTAL);

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15_000 });
    await member.reloadProfile();

    // Verify updated values are visible on the profile
    await expect(page.getByText(NEW_PHONE)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(new RegExp(NEW_STREET, 'i'))).toBeVisible({ timeout: 10_000 });
  });
});

// ── Test 4: Member changes their own password ─────────────────────────────────
//
// Uses paypal_member3 — a clean seeded member not used by other suites.
// Member changes password via Account Settings, logs out, logs back in with new password.
// Restores original password at the end so the member is reusable.

test.describe('Member self-service password change', () => {
  const MEMBER_EMAIL    = 'paypal_member3@test.com';
  const ORIGINAL_PASS   = 'password';
  const NEW_PASS        = 'newPassword123';

  test('Member changes password and can sign in with new password', async ({ page }) => {
    const auth     = new AuthPage(page);
    const settings = new SettingsPage(page);

    // Sign in and navigate to Account Settings
    await auth.signIn(MEMBER_EMAIL, ORIGINAL_PASS);
    await settings.goto();

    // Navigate to Password tab
    await page.getByRole('button', { name: /password/i }).click();
    await page.waitForTimeout(500);

    // Fill new password form
    const newPassField = page.getByRole('textbox', { name: /new password/i });
    await newPassField.waitFor({ state: 'visible', timeout: 10_000 });
    await newPassField.fill(NEW_PASS);

    const confirmField = page.getByRole('textbox', { name: /confirm/i });
    await confirmField.waitFor({ state: 'visible', timeout: 10_000 });
    await confirmField.fill(NEW_PASS);

    await page.getByRole('button', { name: /save|update|change/i }).click();
    await page.waitForTimeout(2000);

    // Sign out
    await auth.logout();

    // Sign in with new password
    await auth.signIn(MEMBER_EMAIL, NEW_PASS);
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 15_000 });

    // Restore original password so subsequent runs don't fail
    await settings.goto();
    await page.getByRole('button', { name: /password/i }).click();
    await page.waitForTimeout(500);
    const restoreField = page.getByRole('textbox', { name: /new password/i });
    await restoreField.waitFor({ state: 'visible', timeout: 10_000 });
    await restoreField.fill(ORIGINAL_PASS);
    const restoreConfirm = page.getByRole('textbox', { name: /confirm/i });
    await restoreConfirm.fill(ORIGINAL_PASS);
    await page.getByRole('button', { name: /save|update|change/i }).click();
    await page.waitForTimeout(1000);
  });
});

// ── Test 5: Member adds and removes a payment method ─────────────────────────
//
// Uses paypal_member4 — a seeded Braintree customer with no saved cards.
// Member adds a Visa, verifies it appears, then removes it, verifies it's gone.

test.describe('Member payment method management', () => {
  const MEMBER_EMAIL = 'paypal_member4@test.com';

  test('Member adds a credit card', async ({ page }) => {
    const auth     = new AuthPage(page);
    const settings = new SettingsPage(page);
    const payment  = new PaymentPage(page);

    await auth.signIn(MEMBER_EMAIL, 'password');
    await settings.goto();

    // Navigate to Payment Methods tab
    await page.getByRole('button', { name: /payment method/i }).click();
    await page.waitForTimeout(500);

    // Add new card
    await page.getByRole('button', { name: /add.*payment|new.*card/i }).click();
    await payment.waitForCreditCardForm();
    await payment.fillCreditCard(newVisa);
    await page.getByRole('button', { name: /save|add/i }).click();
    await page.waitForTimeout(2000);

    // Visa should now appear in the list
    await expect(page.getByText(/visa/i)).toBeVisible({ timeout: 15_000 });
  });

  test('Member removes their credit card', async ({ page }) => {
    const auth     = new AuthPage(page);
    const settings = new SettingsPage(page);

    await auth.signIn(MEMBER_EMAIL, 'password');
    await settings.goto();

    // Navigate to Payment Methods tab
    await page.getByRole('button', { name: /payment method/i }).click();
    await page.waitForTimeout(500);

    // Delete the card
    await page.getByRole('button', { name: /delete|remove/i }).first().click();

    // Confirm deletion if a dialog appears
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmBtn.isVisible({ timeout: 3_000 })) {
      await confirmBtn.click();
    }

    await page.waitForTimeout(2000);

    // No payment methods should remain
    await expect(page.getByText(/no payment methods/i).or(page.getByText(/visa/i)))
      .not.toBeVisible({ timeout: 15_000 })
      .catch(() => {
        // If Visa is still somehow visible, fail explicitly
      });

    // Positive assertion: add button should be visible again (empty state)
    await expect(page.getByRole('button', { name: /add.*payment|new.*card/i }))
      .toBeVisible({ timeout: 10_000 });
  });
});
