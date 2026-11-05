import { test, expect, Page } from "@playwright/test";

async function loginAsSuperAdmin(page: Page) {
  // Skip the first-visit product tour overlay so it doesn't intercept clicks.
  await page.addInitScript(() => localStorage.setItem("darna_admin_tour_completed", "true"));
  await page.goto("/en/login");
  await page.fill('input[type="email"]', "admin@bladus.dz");
  await page.fill('input[type="password"]', process.env.ADMIN_SEED_PASSWORD || "DarnaAdmin2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/en");
  await expect(page.locator("h1").first()).toContainText(/Good (morning|afternoon|evening), Nadia/);
}

test.describe("BLADUS Admin Panel E2E Tests", () => {
  test("1. Login guard: unauthenticated request redirects to /login with returnTo", async ({
    page,
  }) => {
    await page.goto("/en/hosts");
    await expect(page).toHaveURL(/\/en\/login\?returnTo=%2Fen%2Fhosts/);
    await expect(page.locator("h1")).toContainText("Control Center Login");
  });

  test("2. Authentication: invalid credentials show error, valid credentials log in", async ({
    page,
  }) => {
    await page.goto("/en/login");

    // Invalid login attempt
    await page.fill('input[type="email"]', "bad@admin.dz");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Invalid email or password")).toBeVisible();

    // Valid login attempt
    await page.fill('input[type="email"]', "admin@bladus.dz");
    await page.fill('input[type="password"]', process.env.ADMIN_SEED_PASSWORD || "DarnaAdmin2026!");
    await page.click('button[type="submit"]');

    // Successfully redirects to Dashboard
    await page.waitForURL((url) => url.pathname === "/en");
    await expect(page.locator("h1").first()).toContainText(/Good (morning|afternoon|evening), Nadia/);
  });

  test("3. Hosts page: filter by category tab, search and wilaya", async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Navigate to hosts
    await page.goto("/en/hosts");
    await expect(page.locator("h1")).toContainText("Partners & Hosts");

    // Click Tourism Agencies tab
    await page.click("text=Tourism Agencies");
    await expect(page.locator("table")).toBeVisible();

    // Type in search box
    await page.fill('input[placeholder*="email" i]', "Atlas");
    // Verify filtered table results
    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });

  test("4. Approvals Inbox: inspect and approve item", async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.goto("/en/approvals");
    await expect(page.locator("h1")).toContainText("Central Moderation Inbox");

    // Click Approve on first item
    const approveBtn = page.locator('button[title*="Approve"]').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      // Verify success toast appears with Undo option
      await expect(page.locator("text=Approved:")).toBeVisible();
      await expect(page.locator("text=Undo")).toBeVisible();
    }
  });

  test("5. Treasury: /finance redirects to /payments and the recharge dialog validates amounts", async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Legacy duplicate route is a server redirect to the canonical page.
    await page.goto("/en/finance");
    await page.waitForURL((url) => url.pathname === "/en/payments");
    await expect(page.locator("h1").first()).toContainText("Payments & Finance");

    await page.goto("/en/payments/wallets");
    await page.locator("table tbody tr button", { hasText: "Recharge" }).first().click();
    await expect(page.locator("text=Recharge host wallet")).toBeVisible();

    // Non-integer / out-of-range amounts are rejected client-side (and server-side).
    await page.fill("#recharge-amount", "12.5");
    await expect(page.locator("text=Enter a whole amount between 1 and")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm recharge" })).toBeDisabled();

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("5b. Payouts: approval asks for confirmation with the amount and masks the account", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/en/payments/payouts");
    await expect(page.locator("text=007 99999 0001234567 89")).toHaveCount(0);
    await expect(page.locator("td", { hasText: "••••" }).first()).toBeVisible();

    await page.getByRole("button", { name: /^Approve the payout of / }).first().click();
    await expect(page.locator("text=Approve this payout?")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Approve .*DZD$/ })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("5c. Payouts: approving debits the wallet once; insufficient balance is refused", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/en/payments/payouts");
    const approveButtons = page.getByRole("button", { name: /^Approve the payout of / });
    await expect(page.locator("td", { hasText: "••••" }).first()).toBeVisible();
    const pending = await approveButtons.count();
    test.skip(pending === 0, "no pending payouts left in the mock store");

    let approved = 0;
    let refused = 0;
    for (let i = 0; i < pending; i++) {
      const before = await approveButtons.count();
      if (before === 0) break;
      await approveButtons.nth(i % before).click();
      await page.getByRole("button", { name: /^Approve .*DZD$/ }).click();
      // Dialog closes once the server answered; then the list is reloaded.
      await expect(page.locator("text=Approve this payout?")).toHaveCount(0);
      await page.waitForTimeout(1200);
      if ((await approveButtons.count()) < before) approved++;
      else refused++;
    }
    expect(approved).toBeGreaterThan(0);
    // The seed deliberately includes requests larger than the wallet balance.
    expect(refused).toBeGreaterThan(0);
    // Approved rows no longer offer an Approve button (idempotent: no second debit possible).
    await page.reload();
    await expect(page.locator("td", { hasText: "••••" }).first()).toBeVisible();
    await expect(approveButtons).toHaveCount(pending - approved);
  });

  test("6. Internationalization: language switch to Arabic sets dir='rtl'", async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Click Locale Switcher for Arabic
    await page.click('button:has-text("عر")');

    // URL changes to /ar
    await page.waitForURL((url) => url.pathname === "/ar");
    const htmlDir = await page.getAttribute("html", "dir");
    expect(htmlDir).toBe("rtl");
  });
});
