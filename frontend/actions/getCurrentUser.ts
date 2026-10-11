"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data/auth";

export default async function getCurrentUserAction() {
  const cookieStore = cookies();
  const cookieUserId = cookieStore.get("darna_user_id")?.value;
  return await getCurrentUser(cookieUserId);
}
