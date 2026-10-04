"use client";

import React, { useState, useMemo } from "react";
import { SafeReservation } from "@/types";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MdSearch, MdCancel } from "react-icons/md";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "@/navigation";

interface Props {
  initialReservations: SafeReservation[];
}

export default function AdminBookingsClient({ initialReservations }: Props) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [reservations, setReservations] =
    useState<SafeReservation[]>(initialReservations);
  const [search, setSearch] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchSearch =
        r.listing?.title.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [reservations, search]);

  const handleCancelBooking = async (id: string) => {
    if (!confirm(t("confirmCancelBooking"))) return;

    setCancellingId(id);
    try {
      await axios.delete(`/api/reservations/${id}`);
      setReservations((prev) => prev.filter((item) => item.id !== id));
      toast.info(t("bookingCancelled"));
      router.refresh();
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <MdSearch
            size={20}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-neutral-900 transition"
          />
        </div>
        <span className="text-xs font-semibold text-neutral-500">
          {t("totalCount", { count: filteredReservations.length })}
        </span>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-tertiary shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-tertiary/20 text-xs text-primary uppercase border-b border-tertiary">
              <tr>
                <th className="py-3.5 px-4 text-start font-semibold">{t("bookingId")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("listing")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("dates")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("total")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("statusAll")}</th>
                <th className="py-3.5 px-4 text-end font-semibold">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">
                      #{res.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                          <Image
                            src={res.listing?.imageSrc || "/assets/placeholder.jpg"}
                            alt={res.listing?.title || "Listing"}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="max-w-[200px] truncate">
                          <p className="font-semibold text-primary truncate">
                            {res.listing?.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {res.listing?.locationValue}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 text-xs whitespace-nowrap">
                      {new Date(res.startDate).toLocaleDateString()} -{" "}
                      {new Date(res.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary whitespace-nowrap">
                      {res.totalPrice.toLocaleString()} DZD{" "}
                      <span className="text-xs text-neutral-500 font-normal">
                        (~€{Math.round(res.totalPrice / 152.47)})
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full bg-status-success/15 text-status-success border border-status-success/20">
                        {t("statusConfirmed")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(res.id)}
                        disabled={cancellingId === res.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-status-error hover:bg-status-error/10 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        <MdCancel size={16} />
                        <span>{tCommon("cancel")}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
