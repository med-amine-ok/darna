import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import type { ApiSession } from "@/lib/api/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import { actionFail } from "@/lib/action-result";
import { startSession } from "@/lib/server/session";
import { isTrustedJsonRequest } from "@/lib/server/request-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isTrustedJsonRequest(request)) {
    return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name : "";
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(actionFail("INVALID_REGISTRATION"), { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(actionFail("PASSWORD_TOO_SHORT", { min: MIN_PASSWORD_LENGTH }), { status: 400 });
    }
    const [firstName, ...rest] = (name || email.split("@")[0] || "").trim().split(/\s+/);
    let answer: ApiSession;
    try {
      answer = await api("/auth/signup", {
        method: "POST",
        anonymous: true,
        body: {
          email,
          password,
          first_name: firstName ?? "",
          last_name: rest.join(" "),
          locale: request.cookies.get("NEXT_LOCALE")?.value ?? "fr",
          accept_terms_version: "2026-11",
        },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return NextResponse.json(actionFail("TOO_MANY_ATTEMPTS"), { status: 429 });
      }
      if (error instanceof ApiError && error.status < 500) {
        const taken = error.code === "email_taken" || error.status === 409;
        return NextResponse.json(actionFail(taken ? "EMAIL_TAKEN" : "INVALID_REGISTRATION"), { status: taken ? 409 : 400 });
      }
      throw error;
    }
    // Email sign-up (ACC-01): the account waits for the 6-digit code emailed by the
    // backend; the browser shows the code step and posts it to /api/auth/email-code.
    if (answer.status === "pending_flow" && answer.pending_flows?.some((flow) => flow.id === "verify_email")) {
      return NextResponse.json({ success: true, verifyEmail: true });
    }
    const user = answer.session_token ? await startSession(answer.session_token) : null;
    if (!user) {
      return NextResponse.json(actionFail("REGISTRATION_FAILED"), { status: 500 });
    }

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, hostType: null, profileComplete: false },
    });
    res.cookies.set("darna_mode", "traveler", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("[auth/register] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
