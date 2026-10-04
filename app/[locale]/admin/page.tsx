import React from "react";
import { getAdminStats, getListings, getAllReservations, getReviews } from "@/lib/data";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import Image from "next/image";
import AdminCharts from "@/components/admin/AdminCharts";
import {
  MdAttachMoney,
  MdCalendarMonth,
  MdHomeWork,
  MdPeople,
  MdArrowUpward,
  MdChevronRight,
  MdRateReview,
} from "react-icons/md";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const listings = await getListings();
  const reservations = await getAllReservations();
  const reviews = await getReviews();
  const t = await getTranslations("admin");

  const recentReservations = reservations.slice(0, 5);
  const recentListings = listings.slice(0, 4);

  const kpis = [
    {
      label: t("totalRevenue"),
      value: `${stats.totalRevenue.toLocaleString()} DZD`,
      change: `+${stats.revenueChangeMonth}%`,
      icon: MdAttachMoney,
      color: "bg-accent/10 text-accent border-accent/20",
    },
    {
      label: t("totalBookings"),
      value: stats.totalBookings.toString(),
      change: `+${stats.bookingsChangeMonth}%`,
      icon: MdCalendarMonth,
      color: "bg-secondary/15 text-secondary-700 border-secondary/25",
    },
    {
      label: t("activeListings"),
      value: listings.length.toString(),
      change: `+${stats.listingsChangeMonth}%`,
      icon: MdHomeWork,
      color: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: t("registeredUsers"),
      value: stats.totalUsers.toString(),
      change: `+${stats.usersChangeMonth}%`,
      icon: MdPeople,
      color: "bg-tertiary/30 text-primary border-tertiary",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            {t("title")}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/listings"
            className="px-4 py-2 bg-primary hover:bg-primary-800 text-white rounded-xl text-sm font-semibold transition shadow-xs"
          >
            {t("manageListings")}
          </Link>
          <Link
            href="/admin/reviews"
            className="px-4 py-2 bg-white hover:bg-background text-primary border border-tertiary rounded-xl text-sm font-semibold transition"
          >
            {t("moderateReviews")} ({reviews.length})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-tertiary shadow-2xs hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`p-2.5 rounded-xl border ${kpi.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-primary">
                  {kpi.value}
                </span>
                <span className="flex items-center text-xs font-semibold text-secondary-700 bg-secondary-50 px-2 py-0.5 rounded-full">
                  <MdArrowUpward size={12} className="me-0.5" />
                  {kpi.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance & Distribution Charts (Step 5) */}
      <AdminCharts />

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings Table (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-tertiary p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-primary">
                {t("recentBookings")}
              </h2>
              <p className="text-xs text-neutral-500">
                {t("recentBookingsSubtitle")}
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <span>{t("viewAll")}</span>
              <MdChevronRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="text-xs text-neutral-400 uppercase border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-2 text-start font-semibold">{t("listing")}</th>
                  <th className="py-3 px-2 text-start font-semibold">{t("dates")}</th>
                  <th className="py-3 px-2 text-start font-semibold">{t("total")}</th>
                  <th className="py-3 px-2 text-start font-semibold">{t("statusAll")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                          <Image
                            src={res.listing?.imageSrc || "/assets/placeholder.jpg"}
                            alt={res.listing?.title || "Listing"}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="truncate max-w-[160px] sm:max-w-[220px]">
                          <p className="font-semibold text-neutral-900 truncate">
                            {res.listing?.title}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {res.listing?.locationValue}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-neutral-600 text-xs whitespace-nowrap">
                      {new Date(res.startDate).toLocaleDateString()} -{" "}
                      {new Date(res.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 font-bold text-neutral-900 whitespace-nowrap">
                      {res.totalPrice.toLocaleString()} DZD{" "}
                      <span className="text-xs text-neutral-500 font-normal">
                        (~€{Math.round(res.totalPrice / 152.47)})
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {t("statusConfirmed")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Listings Widget (1 col) */}
        <div className="bg-white rounded-2xl border border-tertiary p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-primary">
                  {t("recentListings")}
                </h2>
                <p className="text-xs text-neutral-500">
                  {t("recentListingsSubtitle")}
                </p>
              </div>
              <Link
                href="/admin/listings"
                className="text-xs font-semibold text-accent hover:underline"
              >
                {t("viewAll")}
              </Link>
            </div>

            <div className="space-y-3.5">
              {recentListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition"
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                    <Image
                      src={listing.imageSrc}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">
                      {listing.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {listing.category} · ${listing.price}/night
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 mt-4">
            <Link
              href="/admin/listings"
              className="w-full block text-center py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition"
            >
              {t("browseAllListings", { count: listings.length })}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
