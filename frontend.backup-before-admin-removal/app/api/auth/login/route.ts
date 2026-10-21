import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/data/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await authenticateUser(email, name);

    const res = NextResponse.json({
      success: true,
      user,
    });

    // 1 year persistent session cookie
    res.cookies.set("darna_user_id", user.id, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    if (user.hostType) {
      res.cookies.set("darna_host_type", user.hostType, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      res.cookies.set("darna_mode", "host", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      if (user.organizationId) {
        res.cookies.set("darna_agency_id", user.organizationId, {
          path: "/",
          maxAge: 31536000,
          sameSite: "lax",
        });
      } else {
        res.cookies.delete("darna_agency_id");
      }
    } else {
      res.cookies.set("darna_mode", "traveler", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
