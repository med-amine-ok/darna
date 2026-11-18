import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { MFA_PENDING_COOKIE, type ApiSession } from "@/lib/api/account";
import { sessionCookieOptions } from "@/lib/auth/session-token";
import { startSession } from "@/lib/server/session";
import { isTrustedJsonRequest } from "@/lib/server/request-guard";
import { actionFail } from "@/lib/action-result";

export const dynamic = "force-dynamic";

/**
 * Second step of a sign-in (BR-ACC-04): the 6-digit code of the authenticator
 * app, or a recovery code, goes to POST /auth/2fa/authenticate with the
 * step-1 token kept by /api/auth/login. The same token becomes the session.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedJsonRequest(request)) {
    return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
  }
  const pending = request.cookies.get(MFA_PENDING_COOKIE)?.value;
  if (!pending) {
    // Expired or never started: the person signs in again.
    return NextResponse.json(actionFail("UNAUTHENTICATED"), { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "").slice(0, 32) : "";
    if (!code) return NextResponse.json(actionFail("INVALID_CODE"), { status: 400 });

    let answer: ApiSession;
    try {
      answer = await api<ApiSession>("/auth/2fa/authenticate", {
        method: "POST",
        body: { code },
        anonymous: true,
        headers: { "X-Session-Token": pending },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return NextResponse.json(actionFail("TOO_MANY_ATTEMPTS"), { status: 429 });
      }
      if (error instanceof ApiError && error.status === 401) {
        const res = NextResponse.json(actionFail("UNAUTHENTICATED"), { status: 401 });
        res.cookies.set(MFA_PENDING_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
        return res;
      }
      if (error instanceof ApiError && error.status < 500) {
        return NextResponse.json(actionFail("INVALID_CODE"), { status: 400 });
      }
      throw error;
    }

    const token = answer.session_token || pending;
    const user = answer.status === "authenticated" ? await startSession(token) : null;
    if (!user) return NextResponse.json(actionFail("INVALID_CODE"), { status: 400 });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, hostType: user.hostType ?? null },
    });
    res.cookies.set(MFA_PENDING_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
    res.cookies.set("darna_mode", user.hostType ? "host" : "traveler", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("[auth/2fa] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
