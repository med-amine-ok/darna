import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/data/auth";
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

    const result = await registerUser({ name: name || email.split("@")[0] || "", email, password });
    if (!result.ok) {
      const failure =
        result.reason === "WEAK_PASSWORD"
          ? actionFail("PASSWORD_TOO_SHORT", { min: MIN_PASSWORD_LENGTH })
          : result.reason === "EMAIL_TAKEN"
          ? actionFail("EMAIL_TAKEN")
          : actionFail("INVALID_REGISTRATION");
      return NextResponse.json(failure, { status: result.reason === "EMAIL_TAKEN" ? 409 : 400 });
    }

    await startSession(result.user);

    const res = NextResponse.json({
      success: true,
      user: { id: result.user.id, name: result.user.name, hostType: null },
    });
    res.cookies.set("darna_mode", "traveler", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  } catch (error) {
    console.error("[auth/register] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
