import { execSync } from 'child_process';

function runRailsCmd(cmd: string): void {
  const railsDir = process.env.RAILS_DIR;
  execSync(`RAILS_ENV=test ${cmd}`, {
    stdio: 'pipe',
    cwd: railsDir || process.cwd(),
  });
}

/**
 * Create a rejection card with the given UID.
 * Used to simulate a fob being presented to the card reader.
 */
export const createRejectCard = (uid: string): void => {
  runRailsCmd(`bundle exec rake "db:reject_card[${uid}]"`);
};

/**
 * Fire a Braintree subscription_cancelled webhook for the given member email.
 */
export const cancelMemberSubscription = (email: string): void => {
  runRailsCmd(`bundle exec rake "db:braintree_webhook[${email}]"`);
};

/**
 * Fire a PayPal subscr_cancel IPN for the given member email.
 */
export const cancelPaypalSubscription = (email: string): void => {
  runRailsCmd(`bundle exec rake "db:paypal_webhook[${email}]"`);
};
