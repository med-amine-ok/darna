import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
import { mockUsers, currentUserMock } from "./lib/mock-data/users";
import { mockListings } from "./lib/mock-data/listings";
import { mockOrganizations } from "./lib/mock-data/organizations";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Match /host, /en/host, /fr/host, /ar/host, and any subroutes like /en/host/listings
  const hostMatch = pathname.match(/^\/(en|fr|ar)?\/?host(\/.*)?$/);

  if (hostMatch) {
    const locale = hostMatch[1] || defaultLocale;
    const cookieUserId = request.cookies.get("darna_user_id")?.value;
    const cookieHostType = request.cookies.get("darna_host_type")?.value;

    // Determine current user
    const user = (cookieUserId ? mockUsers.find((u) => u.id === cookieUserId) : null) || currentUserMock;

    // Check effective hostType: cookie override or user data
    const effectiveHostType = cookieHostType || user.hostType;

    // 1. hostType is unset / null -> Redirect to host-type selection screen
    if (!effectiveHostType) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/become-a-host`;
      return NextResponse.redirect(url);
    }

    // 2. Individual host: must have completed/published at least one listing
    if (effectiveHostType === "individual") {
      const hasListings =
        cookieHostType === "individual" || mockListings.some((l) => l.hostUserId === user.id);
      if (!hasListings) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/become-a-host/1`;
        return NextResponse.redirect(url);
      }
    }

    // 3. Agency host: must have completed organization record
    if (effectiveHostType === "agency") {
      const org = mockOrganizations.find(
        (o) => o.id === user.organizationId || o.ownerUserId === user.id
      );
      const isVerifiedOrg =
        cookieHostType === "agency" || (org && Boolean(org.verificationStatus));
      if (!isVerifiedOrg) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/become-a-host/agency`;
        return NextResponse.redirect(url);
      }
    }

    // 4. Agency specific subroutes: /host/agency/*
    if (pathname.includes("/host/agency") && effectiveHostType !== "agency") {
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
