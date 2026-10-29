import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility smoke test: no serious/critical axe violations (WCAG 2.1 A/AA)
 * on the key back-office screens, in LTR (en) and RTL (ar).
 */

async function loginAsSuperAdmin(page: Page) {
  await page.addInitScript(() => localStorage.setItem("darna_admin_tour_completed", "true"));
  await page.goto("/en/login");
  await page.fill('input[type="email"]', "admin@darna.dz");
  await page.fill('input[type="password"]', process.env.ADMIN_SEED_PASSWORD || "DarnaAdmin2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/en");
}

async function expectNoSeriousViolations(page: Page, label: string) {
  // Let client data (server actions) and entrance animations settle.
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes
        .slice(0, 8)
        .map((n) => `${n.target.join(" ")}  ${n.html.slice(0, 160)}  ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`)
        .join("\n    ")}`
  );
  expect(summary, `${label}: serious/critical axe violations`).toEqual([]);
}

test.describe("Accessibility smoke (axe)", () => {
  test("login page", async ({ page }) => {
    await page.goto("/en/login");
    await expectNoSeriousViolations(page, "login");
  });

  for (const path of ["/", "/bookings", "/payments"]) {
    test(`panel ${path} (en)`, async ({ page }) => {
      await loginAsSuperAdmin(page);
      await page.goto(`/en${path === "/" ? "" : path}`);
      await expectNoSeriousViolations(page, `en ${path}`);
    });
  }

  test("dashboard in Arabic (RTL)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoSeriousViolations(page, "ar /");
  });
});

test.describe("Boundaries", () => {
  test("unknown route and unknown listing id render the localized 404", async ({ page }) => {
    await loginAsSuperAdmin(page);
    const res = await page.goto("/en/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    // notFound() from a streamed page (behind loading.tsx) keeps the 200 status but renders the 404 UI.
    await page.goto("/en/stays/does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("command palette exposes the combobox/listbox pattern", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.waitForLoadState("load");
    await expect(page.locator("header")).toBeVisible();
    await page.waitForTimeout(1500); // hydration
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const combo = dialog.getByRole("combobox");
    await expect(combo).toBeFocused();
    await combo.fill("a");
    await expect(dialog.getByRole("listbox")).toBeVisible();
    await expect(dialog.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
