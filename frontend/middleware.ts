import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth/session-token";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

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
 * Coarse, cookie-only route guards. The session is verified (HMAC) here, but
 * pages and server actions still re-check everything against the server
 * store, the middleware is only a fast first line of defence.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] || defaultLocale;
  const pathWithoutLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

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
