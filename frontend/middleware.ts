import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth/session-token";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/** Same name as API_TOKEN_COOKIE in lib/api/client.ts. */
const API_TOKEN_COOKIE = "bladus_api_token";

// "/trips" itself (the guest's bookings) is private; "/trips/<id>" is a public trip page.
const PROTECTED_USER_EXACT = ["/trips"];

const PROTECTED_USER_PREFIXES = [
  "/become-a-host",
  "/favorites",
  "/profile",
  "/settings",
  "/reservations",
  "/properties",
  "/messages",
  "/notifications",
  "/welcome",
];

function redirectTo(
  request: NextRequest,
  pathname: string,
  callbackUrl?: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (callbackUrl) url.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(url);
}

/**
 * Coarse, cookie-only route guards. The session claim is verified (HMAC) here,
 * but pages and server actions still ask the Django API, which is the
 * authority (a revoked token signs the person out there). The middleware is
 * only a fast first line of defence.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] || defaultLocale;
  const pathWithoutLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  // Signed in = a valid signed claim AND the Django token cookie
  // (lib/api/client.ts API_TOKEN_COOKIE; not imported here: that module is server-only).
  const session = request.cookies.get(API_TOKEN_COOKIE)?.value
    ? await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
    : null;

  const isProtectedUserRoute =
    PROTECTED_USER_EXACT.includes(pathWithoutLocale) ||
    PROTECTED_USER_PREFIXES.some(
      (prefix) =>
        pathWithoutLocale === prefix ||
        pathWithoutLocale.startsWith(`${prefix}/`),
    );
  const isHostRoute =
    pathWithoutLocale === "/host" || pathWithoutLocale.startsWith("/host/");

  if ((isProtectedUserRoute || isHostRoute) && !session) {
    return redirectTo(
      request,
      `/${locale}/login`,
      `/${locale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`,
    );
  }

  // Host routes only need a signed-in session here. Whether the user is a
  // host (and which organization they act for) is decided by the host layout
  // against the server store (requireHostContext): a stale cookie claim must
  // never bounce a real host out of their workspace.

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
