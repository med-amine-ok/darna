"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@/types";
import { ActionResult, actionFail, actionOk } from "@/lib/action-result";
import { getSessionUser } from "@/lib/server/session";
import { changePassword, updateUserProfile } from "@/lib/data/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");

  const currentPassword = typeof input?.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input?.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input?.confirmPassword === "string" ? input.confirmPassword : "";

  if (!currentPassword || !newPassword) return actionFail("PASSWORD_FIELDS_REQUIRED");
  if (newPassword !== confirmPassword) return actionFail("PASSWORD_MISMATCH");
  if (newPassword === currentPassword) {
    return actionFail("PASSWORD_SAME_AS_CURRENT");
  }

  const result = await changePassword(user.id, currentPassword, newPassword);
  if (!result.ok) {
    if (result.reason === "WRONG_PASSWORD") return actionFail("WRONG_PASSWORD");
    if (result.reason === "WEAK_PASSWORD") {
      return actionFail("PASSWORD_TOO_SHORT", { min: MIN_PASSWORD_LENGTH });
    }
    return actionFail("NOT_FOUND");
  }
  return actionOk(null);
}

/** Self-service profile edits (whitelisted fields only). */
export async function updateProfileAction(patch: {
  name?: string;
  bio?: string;
  phone?: string;
  address?: string;
  languages?: string[];
}): Promise<ActionResult<User>> {
  const user = await getSessionUser();
  if (!user) return actionFail("UNAUTHENTICATED");
  if (!patch || typeof patch !== "object") return actionFail("INVALID_INPUT");
  if (patch.name !== undefined && (typeof patch.name !== "string" || !patch.name.trim())) {
    return actionFail("NAME_EMPTY");
  }

  const updated = await updateUserProfile(user.id, {
    name: patch.name,
    bio: patch.bio,
    phone: patch.phone,
    address: patch.address,
    languages: patch.languages,
  });
  if (!updated) return actionFail("NOT_FOUND");
  revalidatePath("/", "layout");
  return actionOk(updated);
}
