import { execSync } from "node:child_process";

/**
 * Global setup for Playwright e2e:
 * - Requires DATABASE_URL_TEST pointing at a throwaway DB
 * - Resets the schema with `prisma db push --force-reset` so each run starts clean
 *
 * Run once before specs. Web server is started by Playwright's `webServer`.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST is required for e2e. Point it at a separate test database " +
        "(e.g. createdb stackzio_test).",
    );
  }
  console.log(`[e2e] Resetting schema on ${redact(url)}…`);
  execSync(
    "pnpm --filter @stackzio/db exec prisma db push --force-reset --accept-data-loss --skip-generate",
    {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    },
  );
}

function redact(url: string) {
  return url.replace(/:\/\/[^@]+@/, "://***:***@");
}
