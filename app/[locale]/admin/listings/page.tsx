import React from "react";
import { getListings } from "@/lib/data";
import { getTranslations } from "next-intl/server";
import AdminListingsClient from "@/components/admin/AdminListingsClient";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const listings = await getListings();
  const t = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          {t("listings")}
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          {t("listingsSubtitle")}
        </p>
      </div>

      <AdminListingsClient initialListings={listings} />
    </div>
  );
}
