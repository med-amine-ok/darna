import { NextResponse } from "next/server";
import { updateMockStores } from "@/lib/mock-data";

// TODO: replace with Supabase query
export async function POST(request: Request) {
  const body = await request.json();
  const { email, name } = body;

  const newUser = {
    id: `user-${Date.now()}`,
    email,
    name: name || "DARNA Guest",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favoriteIds: [],
    role: "guest",
  };

  updateMockStores.addUser(newUser as any);

  return NextResponse.json(newUser);
}
