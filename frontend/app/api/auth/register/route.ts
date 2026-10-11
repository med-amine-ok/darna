import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/data/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await authenticateUser(email, name || email.split("@")[0]);

    const res = NextResponse.json({
      success: true,
      user,
    });

    res.cookies.set("darna_user_id", user.id, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    res.cookies.set("darna_mode", "traveler", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Registration failed" },
      { status: 500 }
    );
  }
}
