import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { MFA_PENDING_COOKIE, MFA_PENDING_MAX_AGE_SECONDS, type ApiSession } from "@/lib/api/account";
import { sessionCookieOptions } from "@/lib/auth/session-token";
import { startSession } from "@/lib/server/session";
import { isTrustedJsonRequest } from "@/lib/server/request-guard";
import { actionFail } from "@/lib/action-result";

export const dynamic = "force-dynamic";

/**
 * Sign in with email and password (POST /auth/login).
 *
 * When the account has an authenticator app the backend answers
 * ``pending_flow``: the step-1 token is kept in a short-lived httpOnly
 * cookie and the browser is asked for the code (``{ mfaRequired: true }``),
 * which it sends to /api/auth/2fa. An account whose email is not confirmed
 * yet answers ``{ verifyEmail: true }``: the browser asks for the emailed code.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedJsonRequest(request)) {
    return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 400 });
    }

    let answer: ApiSession;
    try {
      answer = await api<ApiSession>("/auth/login", { method: "POST", body: { email, password }, anonymous: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return NextResponse.json(actionFail("TOO_MANY_ATTEMPTS"), { status: 429 });
      }
      if (error instanceof ApiError && error.code === "email_not_verified") {
        // Right password, email not confirmed yet (ACC-01): ask for the emailed code.
        return NextResponse.json({ success: false, verifyEmail: true });
      }
      if (error instanceof ApiError && error.status < 500) {
        return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 401 });
      }
      throw error;
    }
    if (!answer.session_token) {
      return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 401 });
    }

    if (answer.status === "pending_flow") {
      const res = NextResponse.json({ success: false, mfaRequired: true });
      res.cookies.set(MFA_PENDING_COOKIE, answer.session_token, sessionCookieOptions(MFA_PENDING_MAX_AGE_SECONDS));
      return res;
    }

    const user = await startSession(answer.session_token);
    if (!user) {
      return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, hostType: user.hostType ?? null, profileComplete: Boolean(user.profileComplete) },
    });
    // UI preference only (not identity): which workspace to show by default.
    res.cookies.set("darna_mode", user.hostType ? "host" : "traveler", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    res.cookies.set(MFA_PENDING_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
    return res;
  } catch (error) {
    console.error("[auth/login] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
