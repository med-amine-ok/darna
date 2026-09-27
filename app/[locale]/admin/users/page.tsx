import React from "react";
import { getUsers } from "@/lib/data";
import { getTranslations } from "next-intl/server";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getUsers();
  const t = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          {t("users")}
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          {t("usersSubtitle")}
        </p>
      </div>

      <AdminUsersClient initialUsers={users} />
    </div>
  );
}
