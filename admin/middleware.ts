import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth/session";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract locale from pathname (e.g. /en/... or /fr/...)
  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] || defaultLocale;
  const pathWithoutLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  const isLoginPage = pathWithoutLocale === "/login" || pathWithoutLocale.startsWith("/login");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico";

  if (isStaticAsset) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // If already logged in and visiting login page, redirect to dashboard
  if (isLoginPage && session) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // If unauthenticated and accessing protected routes, redirect to login
  if (!isLoginPage && !session) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
