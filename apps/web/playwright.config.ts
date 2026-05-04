import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

const requireEnv = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`E2E requires ${name} to be set (point at a throwaway test DB).`);
  return v;
};

const TEST_DB = process.env.DATABASE_URL_TEST ?? "";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: TEST_DB
    ? {
        command: `next dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          NODE_ENV: "development",
          DATABASE_URL: TEST_DB,
          AUTH_SECRET: process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret-test",
          AUTH_URL: baseURL,
          AUTH_TRUST_HOST: "true",
          NEXT_PUBLIC_APP_URL: baseURL,
        },
      }
    : undefined,
});

// Touch requireEnv so tooling doesn't think it's unused.
void requireEnv;
