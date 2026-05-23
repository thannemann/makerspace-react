import cp from 'child_process';

// ── Seeded login credentials ─────────────────────────────────────────────────
// All passwords are 'password'. Counts mirror MEMBER_COUNT in seed_data.rb (6 each).
//
// Roles seeded:
//   admin          — admin_member0-5
//   board_member   — board_member0-5
//   resource_manager — rm_member0-5
//   member (basic) — basic_member0-5   (Visa card, Braintree subscription)
//   member (paypal) — paypal_member0-5 (PayPal billing agreement, Braintree subscription)
//   member (expired) — expired_member0-5
//
// Venmo: not seeded as a member type — Venmo doesn't support recurring subscriptions
// in Braintree. Venmo flows are covered by manual testing on existing members.

const MEMBER_COUNT = 6;
const PASSWORD = 'password';

const makeLogins = (prefix: string, count = MEMBER_COUNT) =>
  Array.from({ length: count }, (_, i) => ({ email: `${prefix}${i}@test.com`, password: PASSWORD }));

export const adminUserLogins        = makeLogins('admin_member');
export const boardMemberLogins      = makeLogins('board_member');
export const resourceManagerLogins  = makeLogins('rm_member');
export const basicUserLogins        = makeLogins('basic_member');
export const paypalUserLogins       = makeLogins('paypal_member');
export const expiredUserLogins      = makeLogins('expired_member');

// Round-robin getters — each call returns the next login in the list
const makeGetter = (logins: { email: string; password: string }[]) => {
  let index = 0;
  return () => logins[index++ % logins.length];
};

export const getAdminUserLogin        = makeGetter(adminUserLogins);
export const getBoardMemberLogin      = makeGetter(boardMemberLogins);
export const getResourceManagerLogin  = makeGetter(resourceManagerLogins);
export const getBasicUserLogin        = makeGetter(basicUserLogins);
export const getPaypalUserLogin       = makeGetter(paypalUserLogins);

// ── Invoice option IDs ───────────────────────────────────────────────────────

export const invoiceOptionIds = {
  monthly:   'one-month',
  quarterly: 'three-months',
  annually:  'one-year',
  household: 'household-one-month',
};

// ── Braintree test card numbers ──────────────────────────────────────────────

export const creditCardNumbers = {
  visa:       '4111111111111111',
  mastercard: '5555555555554444',
  amex:       '378282246310005',
  discover:   '6011111111111117',
  debit:      '4012000033330125',
  invalid:    '4000111111111115',
};
