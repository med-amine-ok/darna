import { test, expect, Page, Browser } from "@playwright/test";

/**
 * Negative auth / RBAC checks. Seed passwords come from env with the same
 * dev defaults as lib/mock-data/admins.ts (`next dev`). For `next start`,
 * export ADMIN_SEED_PASSWORD_* for the accounts below.
 */
const ACCOUNTS = {
  super_admin: { email: "admin@bladus.dz", password: process.env.ADMIN_SEED_PASSWORD || "DarnaAdmin2026!" },
  analyst: { email: "analyst@bladus.dz", password: process.env.ADMIN_SEED_PASSWORD_ANALYST || "DarnaAnalyst2026!" },
  moderator: { email: "moderator@bladus.dz", password: process.env.ADMIN_SEED_PASSWORD_MODERATOR || "DarnaMod2026!" },
};

async function login(page: Page, who: keyof typeof ACCOUNTS, returnTo?: string) {
  await page.goto(`/en/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  await page.fill('input[type="email"]', ACCOUNTS[who].email);
  await page.fill('input[type="password"]', ACCOUNTS[who].password);
  await page.click('button[type="submit"]');
}

async function newPage(browser: Browser) {
  const ctx = await browser.newContext();
  // Skip the first-visit product tour (a modal) so it does not intercept clicks.
  await ctx.addInitScript(() => localStorage.setItem("darna_admin_tour_completed", "true"));
  return ctx.newPage();
}

test.describe("Auth & RBAC hardening", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("darna_admin_tour_completed", "true"));
  });

  test("login form is not pre-filled", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator('input[type="email"]')).toHaveValue("");
    await expect(page.locator('input[type="password"]')).toHaveValue("");
  });

  test("open redirect in returnTo is neutralised", async ({ page }) => {
    await login(page, "super_admin", "//evil.example.com/phish");
    await page.waitForURL((url) => url.pathname === "/en");
    expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host);
  });

  test("valid relative returnTo with query is preserved", async ({ page }) => {
    await login(page, "super_admin", "/en/bookings?status=pending");
    await page.waitForURL((url) => url.pathname === "/en/bookings" && url.search === "?status=pending");
  });

  test("logout clears the httpOnly session", async ({ page }) => {
    await login(page, "super_admin");
    await page.waitForURL((url) => url.pathname === "/en");
    await page.locator("header button:has(img), header button:has(span)").last().click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/en\/login/);
    await page.goto("/en/users");
    await expect(page).toHaveURL(/\/en\/login\?returnTo=/);
  });

  test("analyst gets 403 on restricted sections and no restricted nav", async ({ page }) => {
    await login(page, "analyst");
    await page.waitForURL((url) => url.pathname === "/en");
    for (const path of ["/en/settings/team", "/en/settings", "/en/promotions"]) {
      await page.goto(path);
      await expect(page.getByText("Access restricted")).toBeVisible();
    }
    await expect(page.locator('aside a[href="/en/settings/team"]')).toHaveCount(0);
  });

  test("deactivating an admin revokes their live session and blocks login", async ({ browser }) => {
    const mod = await newPage(browser);
    await login(mod, "moderator");
    await mod.waitForURL((url) => url.pathname === "/en");

    const admin = await newPage(browser);
    await login(admin, "super_admin", "/en/settings/team");
    await admin.waitForURL((url) => url.pathname === "/en/settings/team");
    const row = admin.locator("tr", { hasText: ACCOUNTS.moderator.email });
    await row.getByRole("button", { name: /^Deactivate / }).click();
    await expect(row).toContainText("Deactivated");

    await mod.goto("/en/users");
    await expect(mod).toHaveURL(/\/en\/login/);

    await login(mod, "moderator");
    await expect(mod.getByText("Invalid email or password")).toBeVisible();

    // Restore for other tests.
    await admin.reload();
    const restoredRow = admin.locator("tr", { hasText: ACCOUNTS.moderator.email });
    await restoredRow.getByRole("button", { name: /^Activate / }).click();
    await expect(restoredRow.getByRole("button", { name: /^Deactivate / })).toBeVisible();
  });
});
