import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { mockUsers } from "./lib/mock-data/users";
import { mockListings } from "./lib/mock-data/listings";
import { mockOrganizations } from "./lib/mock-data/organizations";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract locale from pathname (e.g. /en/... or /fr/...)
  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/.*)?$/);
  const locale = localeMatch?.[1] || defaultLocale;
  const pathWithoutLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  const cookieUserId = request.cookies.get("darna_user_id")?.value;
  const cookieHostType = request.cookies.get("darna_host_type")?.value;

  // 1. Protected routes requiring any authenticated user
  const isProtectedUserRoute =
    pathWithoutLocale.startsWith("/become-a-host") ||
    pathWithoutLocale.startsWith("/trips") ||
    pathWithoutLocale.startsWith("/favorites") ||
    pathWithoutLocale.startsWith("/profile") ||
    pathWithoutLocale.startsWith("/settings") ||
    pathWithoutLocale.startsWith("/reservations") ||
    pathWithoutLocale.startsWith("/properties");

  if (isProtectedUserRoute && !cookieUserId) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Protected Host routes (/host and subroutes)
  if (pathWithoutLocale.startsWith("/host")) {
    // If not authenticated -> redirect to login
    if (!cookieUserId) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    const user = mockUsers.find((u) => u.id === cookieUserId);
    const effectiveHostType = cookieHostType || user?.hostType;

    // If authenticated guest without hostType -> redirect to become-a-host onboarding
    if (!effectiveHostType) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/become-a-host`;
      return NextResponse.redirect(url);
    }

    // Individual host guard
    if (effectiveHostType === "individual") {
      const hasListings =
        cookieHostType === "individual" || mockListings.some((l) => l.hostUserId === cookieUserId);
      if (!hasListings) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/become-a-host/1`;
        return NextResponse.redirect(url);
      }
    }

    // Agency host guard
    if (effectiveHostType === "agency") {
      const org = mockOrganizations.find(
        (o) => o.id === user?.organizationId || o.ownerUserId === cookieUserId
      );
      const isVerifiedOrg =
        cookieHostType === "agency" || (org && Boolean(org.verificationStatus));
      if (!isVerifiedOrg) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/become-a-host/agency`;
        return NextResponse.redirect(url);
      }
    }

    // Agency specific subroutes
    if (pathWithoutLocale.startsWith("/host/agency") && effectiveHostType !== "agency") {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/host`;
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
