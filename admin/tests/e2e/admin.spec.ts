import { test, expect, Page } from "@playwright/test";

async function loginAsSuperAdmin(page: Page) {
  await page.goto("/en/login");
  await page.fill('input[type="email"]', "admin@darna.dz");
  await page.fill('input[type="password"]', "DarnaAdmin2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/en");
  await expect(page.locator("h1")).toContainText("Marketplace Command Center");
}

test.describe("DARNA Admin Panel E2E Tests", () => {
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
    await page.fill('input[type="email"]', "admin@darna.dz");
    await page.fill('input[type="password"]', "DarnaAdmin2026!");
    await page.click('button[type="submit"]');

    // Successfully redirects to Dashboard
    await page.waitForURL((url) => url.pathname === "/en");
    await expect(page.locator("h1")).toContainText("Marketplace Command Center");
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
    await page.fill('input[placeholder*="Search by name"]', "Atlas");
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

  test("5. Treasury: open wallet credit recharge dialog", async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.goto("/en/finance");
    await expect(page.locator("h1")).toContainText("Financial Treasury");

    // Click Credit Recharge on first row
    const rechargeBtn = page.locator("text=Credit Recharge").first();
    await rechargeBtn.click();

    // Verify dialog opens
    await expect(page.locator("text=Recharge Wallet:")).toBeVisible();
    await expect(page.locator("text=Confirm Ledger Credit")).toBeVisible();

    // Cancel modal
    await page.click("text=Cancel");
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
