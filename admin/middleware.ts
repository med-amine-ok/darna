import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN_COOKIE, STAFF_IDLE_SECONDS, tokenCookieOptions } from "./lib/auth/cookies";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * First, cheap gate: every page except the login page needs the staff
 * session cookie. The cookie lives 30 minutes and is renewed here on each
 * page request, matching the backend's idle limit (BR-ACC-03), so a panel
 * left alone shows the login again. The authoritative check (token valid,
 * second factor done, staff active, permissions) is GET /admin/auth/session
 * in app/[locale]/(panel)/layout.tsx, guardPage() and every server action.
 */
export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] || defaultLocale;
  const pathWithoutLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  // Exact match only ("/loginx" or "/login/anything" are protected pages).
  const isLoginPage = pathWithoutLocale === "/login" || pathWithoutLocale === "/login/";
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  if (!isLoginPage && !token) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    url.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  const response = intlMiddleware(request);
  // Server actions (Next-Action header) renew it themselves (runAction), and
  // sign-out must not see its cookie deletion raced by a renewal here.
  if (token && !isLoginPage && !request.headers.has("next-action")) {
    // Sliding idle window: the cookie disappears 30 minutes after the last page view.
    response.cookies.set(ADMIN_TOKEN_COOKIE, token, tokenCookieOptions(STAFF_IDLE_SECONDS));
  }
  return response;
}

export const config = {
  // _next, api, _vercel and real static asset files (by extension) are
  // excluded here, so the handler has no "contains a dot" exemption: a page
  // URL such as /en/stays/a.b still goes through the auth gate.
  matcher: [
    "/((?!api|_next|_vercel|.*\\.(?:ico|png|jpe?g|jfif|gif|svg|webp|avif|css|js|map|txt|xml|json|webmanifest|woff2?|ttf)$).*)",
  ],
};
