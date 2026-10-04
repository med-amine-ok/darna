"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  MdLuggage,
  MdLocationOn,
  MdCalendarMonth,
  MdPeople,
  MdChatBubbleOutline,
  MdDownload,
  MdArrowForward,
} from "react-icons/md";
import { toast } from "react-toastify";
import { SafeReservation } from "@/types";
import PriceDisplay from "@/components/common/PriceDisplay";

interface ProfileTripsTabProps {
  reservations: SafeReservation[];
}

type FilterTab = "all" | "upcoming" | "past" | "cancelled";

export default function ProfileTripsTab({ reservations }: ProfileTripsTabProps) {
  const t = useTranslations("profile.tripsSection");
  const router = useRouter();
  const [filter, setFilter] = useState<FilterTab>("all");

  const now = useMemo(() => new Date(), []);

  const upcomingList = useMemo(
    () => reservations.filter((r) => r.status !== "cancelled" && new Date(r.endDate) >= now),
    [reservations, now]
  );

  const pastList = useMemo(
    () =>
      reservations.filter(
        (r) => r.status === "completed" || (r.status !== "cancelled" && new Date(r.endDate) < now)
      ),
    [reservations, now]
  );

  const cancelledList = useMemo(
    () => reservations.filter((r) => r.status === "cancelled"),
    [reservations]
  );

  const displayedList = useMemo(() => {
    if (filter === "upcoming") return upcomingList;
    if (filter === "past") return pastList;
    if (filter === "cancelled") return cancelledList;
    return reservations;
  }, [filter, reservations, upcomingList, pastList, cancelledList]);

  const handleDownloadVoucher = (reservation: SafeReservation) => {
    toast.success(`Booking voucher for ${reservation.listing?.title} downloaded.`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-primary tracking-tight">
            My Stays & Adventures ({reservations.length})
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            View booking details, check-in instructions, and contact your Algerian hosts.
          </p>
        </div>

        {/* Filter Pill Group */}
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-tertiary/40 rounded-2xl shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "all"
                ? "bg-primary text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            All ({reservations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("upcoming")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "upcoming"
                ? "bg-primary text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Upcoming ({upcomingList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("past")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === "past"
                ? "bg-primary text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Past ({pastList.length})
          </button>
          {cancelledList.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter("cancelled")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filter === "cancelled"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Cancelled ({cancelledList.length})
            </button>
          )}
        </div>
      </div>

      {/* Reservation List */}
      {displayedList.length === 0 ? (
        <div className="bg-surface p-12 rounded-3xl border border-tertiary/40 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center">
            <MdLuggage size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">{t("noTrips")}</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              {t("explorePrompt")}
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-600 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            <span>{t("exploreListings")}</span>
            <MdArrowForward size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedList.map((res) => {
            const isCancelled = res.status === "cancelled";
            const startDate = new Date(res.startDate);
            const endDate = new Date(res.endDate);

            return (
              <div
                key={res.id}
                className="bg-surface rounded-3xl border border-tertiary/40 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Photo & Status Header */}
                  <div className="relative h-44 w-full bg-neutral-100">
                    <Image
                      src={res.listing?.imageSrc || "/assets/placeholder.jpg"}
                      alt={res.listing?.title || "Stay"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Status Badge */}
                    <div className="absolute top-3 end-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                          isCancelled
                            ? "bg-red-500 text-white"
                            : new Date(res.endDate) < now
                            ? "bg-neutral-800/80 text-white backdrop-blur-xs"
                            : "bg-emerald-600 text-white backdrop-blur-xs"
                        }`}
                      >
                        {isCancelled
                          ? "Cancelled"
                          : new Date(res.endDate) < now
                          ? "Completed"
                          : "Confirmed"}
                      </span>
                    </div>

                    {/* City location */}
                    <div className="absolute bottom-3 start-4 text-white">
                      <span className="flex items-center gap-1 text-xs font-semibold drop-shadow-sm">
                        <MdLocationOn className="text-accent" size={14} />
                        <span>{res.listing?.city || res.listing?.locationValue}</span>
                      </span>
                      <h4 className="text-sm font-extrabold truncate drop-shadow-sm max-w-[280px]">
                        {res.listing?.title}
                      </h4>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <MdCalendarMonth size={16} className="text-neutral-400" />
                        <span>
                          {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-neutral-500">
                        <MdPeople size={16} className="text-neutral-400" />
                        <span>{res.listing?.guestCount || 2} guests</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <span className="text-xs text-neutral-400 uppercase font-semibold">
                        Total Price
                      </span>
                      <div className="text-end">
                        <PriceDisplay
                          price={res.totalPrice}
                          currency="DZD"
                          className="text-base font-black text-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-neutral-50/60 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadVoucher(res)}
                    className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50 rounded-xl transition cursor-pointer"
                    title="Download Booking Voucher"
                  >
                    <MdDownload size={18} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/messages")}
                      className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <MdChatBubbleOutline size={15} />
                      <span>{t("contactHost")}</span>
                    </button>
                    {res.listing?.id && (
                      <Link
                        href={`/listings/${res.listing.id}`}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-800 rounded-xl transition shadow-2xs"
                      >
                        {t("viewListing")}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
