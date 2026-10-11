import { NextResponse } from "next/server";
import { mockUsers } from "@/lib/mock-data/users";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role: "guest" as const,
      createdAt: new Date().toISOString(),
      favoriteIds: [],
    };

    mockUsers.push(newUser);

    return NextResponse.json(newUser);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
