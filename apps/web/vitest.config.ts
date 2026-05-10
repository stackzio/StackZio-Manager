import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // Integration tests in src/server/**.test.ts hit a hosted Postgres
    // (Supabase pgbouncer) over the public internet. Single round-trips
    // can take 1–3s; tests that do 5–10 writes need a generous ceiling.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
