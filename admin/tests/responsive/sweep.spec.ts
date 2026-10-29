import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createSessionToken } from "../helpers/session";

export const LOCALES = ["fr", "en", "ar"] as const;

export const ROUTES = [
  "/",
  "/users",
  "/stays",
  "/stays/new",
  "/experiences",
  "/trips",
  "/cars",
  "/moderation/providers",
  "/bookings",
  "/payments",
  "/reviews",
  "/promotions",
  "/messages",
  "/stats",
  "/settings",
  "/help",
];

export const VIEWPORT_CONFIGS = [
  { id: "phone_360", width: 360, height: 640, isMobile: true },
  { id: "phone_390", width: 390, height: 844, isMobile: true },
  { id: "phone_landscape", width: 667, height: 375, isMobile: true },
  { id: "tablet_768", width: 768, height: 1024, isMobile: false },
  { id: "desktop_1280", width: 1280, height: 720, isMobile: false },
];

async function createValidSessionToken() {
  return await createSessionToken();
}

interface Finding {
  type: string;
  route: string;
  locale: string;
  viewport: string;
  message: string;
  element?: string;
  severity: "blocking" | "warning";
}

const allFindings: Finding[] = [];
let validSessionToken = "";

test.describe("Responsive Audit & Sweep", () => {
  test.setTimeout(300000); // 5 minutes timeout for full sweep

  test.beforeAll(async () => {
    validSessionToken = await createValidSessionToken();
    const screenshotBase = path.join(process.cwd(), "docs", "responsive", "screenshots");
    if (!fs.existsSync(screenshotBase)) {
      fs.mkdirSync(screenshotBase, { recursive: true });
    }
  });

  test.afterAll(async () => {
    const reportPath = path.join(process.cwd(), "docs", "responsive", "sweep-report.json");
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalRoutesChecked: ROUTES.length,
      localesChecked: LOCALES,
      viewportsChecked: VIEWPORT_CONFIGS.map((v) => `${v.id} (${v.width}x${v.height})`),
      totalFindings: allFindings.length,
      blockingCount: allFindings.filter((f) => f.severity === "blocking").length,
      warningCount: allFindings.filter((f) => f.severity === "warning").length,
      findings: allFindings,
    };

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\n========================================`);
    console.log(`SWEEP REPORT GENERATED: ${reportPath}`);
    console.log(`Total Findings: ${summary.totalFindings} (Blocking: ${summary.blockingCount}, Warnings: ${summary.warningCount})`);
    console.log(`========================================\n`);
  });

  for (const locale of LOCALES) {
    test.describe(`Locale: ${locale}`, () => {
      for (const vp of VIEWPORT_CONFIGS) {
        test(`Sweep [${vp.id}] (${vp.width}x${vp.height}) - ${locale}`, async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            locale,
          });

          await context.addCookies([
            {
              name: "darna_admin_session",
              value: validSessionToken,
              domain: "localhost",
              path: "/",
            },
          ]);

          const page = await context.newPage();

          // Select subset of routes for secondary viewports, all routes for phone_390
          const routesToTest = vp.id === "phone_390"
            ? ROUTES
            : ["/", "/stays", "/stays/new", "/users", "/moderation/providers", "/bookings", "/payments"];

          for (const route of routesToTest) {
            const url = `http://localhost:3001/${locale}${route === "/" ? "" : route}`;
            try {
              await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
              await page.waitForTimeout(600);

              // Detector 1: Horizontal Overflow
              const overflowInfo = await page.evaluate(() => {
                const docWidth = document.documentElement.scrollWidth;
                const winWidth = window.innerWidth;
                const bodyWidth = document.body.scrollWidth;
                const hasOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;

                let worstElement = "";
                if (hasOverflow) {
                  const all = document.querySelectorAll("*");
                  for (const el of Array.from(all)) {
                    const rect = el.getBoundingClientRect();
                    if (rect.right > winWidth + 2) {
                      worstElement = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${
                        el.className ? "." + String(el.className).slice(0, 30) : ""
                      }`;
                      break;
                    }
                  }
                }

                return { hasOverflow, docWidth, winWidth, worstElement };
              });

              if (overflowInfo.hasOverflow) {
                allFindings.push({
                  type: "horizontal_overflow",
                  route,
                  locale,
                  viewport: `${vp.width}x${vp.height}`,
                  message: `Document width (${overflowInfo.docWidth}px) exceeds viewport (${overflowInfo.winWidth}px)`,
                  element: overflowInfo.worstElement,
                  severity: "blocking",
                });
              }

              // Detector 2: Input font-size < 16px (on mobile viewports)
              if (vp.isMobile) {
                const smallFontInputs = await page.evaluate(() => {
                  const inputs = Array.from(
                    document.querySelectorAll(
                      'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea'
                    )
                  );
                  const small = [];
                  for (const inp of inputs) {
                    const fs = parseFloat(window.getComputedStyle(inp).fontSize);
                    if (fs < 15.5) {
                      small.push({
                        tag: inp.tagName.toLowerCase(),
                        fontSize: fs,
                        id: (inp as HTMLElement).id || "",
                      });
                    }
                  }
                  return small;
                });

                if (smallFontInputs.length > 0) {
                  allFindings.push({
                    type: "input_font_size",
                    route,
                    locale,
                    viewport: `${vp.width}x${vp.height}`,
                    message: `${smallFontInputs.length} inputs have font-size < 16px`,
                    element: smallFontInputs[0].tag,
                    severity: "warning",
                  });
                }
              }

              // Screenshot storage
              const safeRouteName = route === "/" ? "dashboard" : route.replace(/\//g, "_").replace(/^_/, "");
              const shotDir = path.join(
                process.cwd(),
                "docs",
                "responsive",
                "screenshots",
                vp.id,
                locale
              );
              if (!fs.existsSync(shotDir)) {
                fs.mkdirSync(shotDir, { recursive: true });
              }
              await page.screenshot({
                path: path.join(shotDir, `${safeRouteName}.png`),
                fullPage: false,
              });
            } catch (err: any) {
              allFindings.push({
                type: "page_load_error",
                route,
                locale,
                viewport: `${vp.width}x${vp.height}`,
                message: err.message,
                severity: "blocking",
              });
            }
          }

          await context.close();
        });
      }
    });
  }
});
