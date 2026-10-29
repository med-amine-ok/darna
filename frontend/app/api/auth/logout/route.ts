import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/server/session";
import { actionFail } from "@/lib/action-result";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
      }
    } catch {
      return NextResponse.json(actionFail("INVALID_INPUT"), { status: 400 });
    }
  }

  try {
    await endSession();
    const res = NextResponse.json({ success: true });
    res.cookies.set("darna_mode", "", { path: "/", maxAge: 0 });
    // Remove identity cookies left over from the old unsigned-cookie scheme.
    for (const legacy of ["darna_user_id", "darna_host_type", "darna_agency_id"]) {
      res.cookies.set(legacy, "", { path: "/", maxAge: 0 });
    }
    return res;
  } catch (error) {
    console.error("[auth/logout] failed", error);
    return NextResponse.json(actionFail("SERVER_ERROR"), { status: 500 });
  }
}
