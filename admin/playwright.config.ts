import { defineConfig, devices } from "@playwright/test";

const PORT = 3001;

/**
 * Dev seed passwords for the mock staff accounts. They mirror the built-in
 * development defaults (lib/mock-data/admins.ts); any value exported in the
 * shell (or CI secrets) wins. Never used in production builds.
 */
const SEED_PASSWORDS: Record<string, string> = {
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD || "DarnaAdmin2026!",
  ADMIN_SEED_PASSWORD_MODERATOR: process.env.ADMIN_SEED_PASSWORD_MODERATOR || "DarnaMod2026!",
  ADMIN_SEED_PASSWORD_SUPPORT: process.env.ADMIN_SEED_PASSWORD_SUPPORT || "DarnaSupport2026!",
  ADMIN_SEED_PASSWORD_FINANCE: process.env.ADMIN_SEED_PASSWORD_FINANCE || "DarnaFinance2026!",
  ADMIN_SEED_PASSWORD_ANALYST: process.env.ADMIN_SEED_PASSWORD_ANALYST || "DarnaAnalyst2026!",
};
// Make them visible to the specs as well (tests/helpers read process.env).
Object.assign(process.env, SEED_PASSWORDS);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  // The dev server compiles each route on first visit.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    navigationTimeout: 60_000,
  },
  webServer: {
    // Override with E2E_WEB_SERVER_COMMAND="npm run build && npm run start" for a production run
    // (then export the ADMIN_SEED_PASSWORD_* and ADMIN_AUTH_SECRET variables).
    command: process.env.E2E_WEB_SERVER_COMMAND || "npm run dev",
    port: PORT,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { ...SEED_PASSWORDS },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
