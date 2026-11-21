import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";
import { isTrustedJsonRequest } from "@/lib/server/request-guard";
import { actionFail } from "@/lib/action-result";

export const dynamic = "force-dynamic";

/**
 * Send a new sign-up code (ACC-01) through POST /auth/email/resend. The
 * backend asks for the password too, so only the person who chose it can get
 * a code for an account that is not confirmed yet.
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
    try {
      await api("/auth/email/resend", { method: "POST", body: { email, password }, anonymous: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        return NextResponse.json(actionFail("TOO_MANY_ATTEMPTS"), { status: 429 });
      }
      if (error instanceof ApiError && error.status < 500) {
        return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 401 });
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[auth/email-code/resend] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
