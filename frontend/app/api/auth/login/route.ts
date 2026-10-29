import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/data/auth";
import { startSession } from "@/lib/server/session";
import { isTrustedJsonRequest } from "@/lib/server/request-guard";
import { actionFail } from "@/lib/action-result";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isTrustedJsonRequest(request)) {
    return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 400 });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json(actionFail("INVALID_CREDENTIALS"), { status: 401 });
    }

    await startSession(user);

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, hostType: user.hostType ?? null },
    });
    // UI preference only (not identity): which workspace to show by default.
    res.cookies.set("darna_mode", user.hostType ? "host" : "traveler", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    console.error("[auth/login] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
