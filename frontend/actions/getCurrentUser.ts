"use server";

import { getCurrentUser } from "@/lib/data/auth";

export default async function getCurrentUserAction() {
  return await getCurrentUser();
}
