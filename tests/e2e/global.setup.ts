import { execSync } from 'child_process';

function runRailsCmd(cmd: string): void {
  const railsDir = process.env.RAILS_DIR;
  execSync(`RAILS_ENV=test ${cmd}`, {
    stdio: 'inherit',
    cwd: railsDir || process.cwd(),
  });
}

async function globalSetup(): Promise<void> {
  if (process.env.SKIP_DB_RESET === 'true') {
    console.log('[setup] SKIP_DB_RESET set — skipping database reset.');
    return;
  }

  // SeedData now handles everything in order:
  //   permissions → members → rental infrastructure (types + spots) → rentals → payments → etc.
  // No separate seeds_rental_spots.rb runner needed.
  console.log('[setup] Resetting and seeding test database...');
  runRailsCmd('bundle exec rake db:db_reset');
  console.log('[setup] Database ready.');
}

export default globalSetup;
