// Creates the biller and prints a one-time setup link (FEATURES.md F1).
//   pnpm create-user --email biller@example.com --name "Jane Doe" --timezone America/Chicago
// Run again with the same email to issue a new link.
// The package.json script passes the repo's .env to Node before any import runs.

import { parseArgs } from "node:util";
import {
  createBillerWithSetupLink,
  isKnownTimezone,
  SETUP_LINK_VALID_HOURS,
} from "../src/server/accounts/create-biller";

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_PRACTICE_NAME = "My practice";
const DEFAULT_APP_URL = "http://localhost:3000";

const { values: options } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    timezone: { type: "string", default: DEFAULT_TIMEZONE },
    practice: { type: "string", default: DEFAULT_PRACTICE_NAME },
  },
});

if (options.email === undefined || options.name === undefined) {
  console.error('Usage: pnpm create-user --email <email> --name "<name>" [--timezone <IANA zone>]');
  process.exit(1);
}
if (!isKnownTimezone(options.timezone)) {
  console.error(`Unknown timezone "${options.timezone}". Use an IANA name like America/Chicago.`);
  process.exit(1);
}

const result = await createBillerWithSetupLink({
  email: options.email,
  name: options.name,
  timezone: options.timezone,
  practiceName: options.practice,
  appUrl: process.env.APP_URL ?? DEFAULT_APP_URL,
});

if (result.wasExistingUser) {
  console.log("This biller already exists, so here is a new setup link.");
} else {
  console.log("Biller created.");
}
console.log(`Setup link (valid ${SETUP_LINK_VALID_HOURS} hours, one use):`);
console.log(result.setupLink);
process.exit(0);
