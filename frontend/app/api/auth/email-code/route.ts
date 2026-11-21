import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { MFA_PENDING_COOKIE, MFA_PENDING_MAX_AGE_SECONDS, type ApiSession } from "@/lib/api/account";
import { sessionCookieOptions } from "@/lib/auth/session-token";
import { startSession } from "@/lib/server/session";
import { isTrustedJsonRequest } from "@/lib/server/request-guard";
import { actionFail } from "@/lib/action-result";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Last step of an email sign-up (ACC-01): the 6-digit code emailed by the
 * backend goes to POST /auth/email/verify. A right code confirms the email
 * and returns a session, which signs the person in here. An older account
 * with an authenticator app still gets its second step (``mfaRequired``).
 */
export async function POST(request: NextRequest) {
  if (!isTrustedJsonRequest(request)) {
    return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
    if (!EMAIL_RE.test(email) || !/^[0-9]{6}$/.test(code)) {
      return NextResponse.json(actionFail("INVALID_CODE"), { status: 400 });
    }

    let answer: ApiSession;
    try {
      answer = await api<ApiSession>("/auth/email/verify", { method: "POST", body: { email, code }, anonymous: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return NextResponse.json(actionFail("TOO_MANY_ATTEMPTS"), { status: 429 });
      }
      if (error instanceof ApiError && error.status < 500) {
        return NextResponse.json(actionFail("INVALID_CODE"), { status: 400 });
      }
      throw error;
    }
    if (!answer.session_token) {
      return NextResponse.json(actionFail("INVALID_CODE"), { status: 400 });
    }

    if (answer.status === "pending_flow") {
      const res = NextResponse.json({ success: false, mfaRequired: true });
      res.cookies.set(MFA_PENDING_COOKIE, answer.session_token, sessionCookieOptions(MFA_PENDING_MAX_AGE_SECONDS));
      return res;
    }

    const user = await startSession(answer.session_token);
    if (!user) {
      return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
    }
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, hostType: user.hostType ?? null, profileComplete: Boolean(user.profileComplete) },
    });
    res.cookies.set("darna_mode", user.hostType ? "host" : "traveler", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("[auth/email-code] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
