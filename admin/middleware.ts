import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth/session";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * First, cheap gate: requires a validly signed, unexpired session JWT for
 * every non-login page. It cannot see the admin store (edge runtime), so the
 * authoritative check (account exists, active, current role/permissions) is
 * done again in app/[locale]/(panel)/layout.tsx, guardPage() and every server
 * action.
 */
export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Extract locale from pathname (e.g. /en/... or /fr/...)
  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] || defaultLocale;
  const pathWithoutLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  // Exact match only ("/loginx" or "/login/anything" are protected pages).
  const isLoginPage = pathWithoutLocale === "/login" || pathWithoutLocale === "/login/";

  if (!isLoginPage) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.search = "";
      url.searchParams.set("returnTo", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }

  // Note: an already-signed-in admin visiting /login is redirected by the
  // login page itself after a store-backed session check (avoids redirect
  // loops for revoked sessions whose JWT is still validly signed).
  return intlMiddleware(request);
}

export const config = {
  // _next, api, _vercel and real static asset files (by extension) are
  // excluded here, so the handler has no "contains a dot" exemption: a page
  // URL such as /en/stays/a.b still goes through the auth gate.
  matcher: [
    "/((?!api|_next|_vercel|.*\\.(?:ico|png|jpe?g|jfif|gif|svg|webp|avif|css|js|map|txt|xml|json|webmanifest|woff2?|ttf)$).*)",
  ],
};
