import React from "react";
import { getAllReservations } from "@/lib/data";
import { getTranslations } from "next-intl/server";
import AdminBookingsClient from "@/components/admin/AdminBookingsClient";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const reservations = await getAllReservations();
  const t = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          {t("bookings")}
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          {t("bookingsSubtitle")}
        </p>
      </div>

      <AdminBookingsClient initialReservations={reservations} />
    </div>
  );
}
