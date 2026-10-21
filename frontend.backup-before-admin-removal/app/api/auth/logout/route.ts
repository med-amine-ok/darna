import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/data/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await logoutUser();

    const res = NextResponse.json({
      success: true,
    });

    res.cookies.set("darna_user_id", "", { path: "/", maxAge: 0 });
    res.cookies.set("darna_host_type", "", { path: "/", maxAge: 0 });
    res.cookies.set("darna_mode", "", { path: "/", maxAge: 0 });
    res.cookies.set("darna_agency_id", "", { path: "/", maxAge: 0 });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Logout failed" },
      { status: 500 }
    );
  }
}
