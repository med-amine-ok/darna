"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import { format, differenceInCalendarDays } from "date-fns";
import axios from "axios";
import { toast } from "react-toastify";
import { MdOutlineLuggage, MdClose, MdCheckCircle, MdCancel, MdHistory } from "react-icons/md";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import Avatar from "@/components/Avatar";
import { SafeReservation, SafeUser } from "@/types";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

type TabType = "upcoming" | "past" | "cancelled";

export default function TripsClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("trips");
  const tListing = useTranslations("listing");
  const tCommon = useTranslations("common");

  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [localReservations, setLocalReservations] = useState<SafeReservation[]>(reservations);
  const [selectedForCancel, setSelectedForCancel] = useState<SafeReservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Group reservations
  const now = useMemo(() => new Date(), []);

  const upcomingList = useMemo(() => {
    return localReservations.filter(
      (r) => r.status !== "cancelled" && new Date(r.endDate) >= now
    );
  }, [localReservations, now]);

  const pastList = useMemo(() => {
    return localReservations.filter(
      (r) => r.status === "completed" || (r.status !== "cancelled" && new Date(r.endDate) < now)
    );
  }, [localReservations, now]);

  const cancelledList = useMemo(() => {
    return localReservations.filter((r) => r.status === "cancelled");
  }, [localReservations]);

  const currentList = useMemo(() => {
    if (activeTab === "upcoming") return upcomingList;
    if (activeTab === "past") return pastList;
    return cancelledList;
  }, [activeTab, upcomingList, pastList, cancelledList]);

  const onConfirmCancel = useCallback(() => {
    if (!selectedForCancel) return;

    setIsCancelling(true);
    axios
      .delete(`/api/reservations/${selectedForCancel.id}`)
      .then(() => {
        toast.info(tListing("reservationCancelled"));
        // Optimistic update
        setLocalReservations((prev) =>
          prev.map((r) =>
            r.id === selectedForCancel.id ? { ...r, status: "cancelled" } : r
          )
        );
        setSelectedForCancel(null);
        router.refresh();
      })
      .catch((error) => {
        toast.error(error?.response?.data?.error || tCommon("error"));
      })
      .finally(() => {
        setIsCancelling(false);
      });
  }, [selectedForCancel, router, tListing, tCommon]);

  return (
    <Container>
      <div className="max-w-7xl mx-auto pb-20">
        <Heading title={t("title")} subtitle={t("subtitle")} />

        {/* Tabs Bar */}
        <div className="flex items-center gap-3 border-b border-neutral-200 mt-6 sm:mt-8 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`pb-3 px-1 text-sm sm:text-base font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 select-none whitespace-nowrap ${
              activeTab === "upcoming"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>{t("tabUpcoming")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "upcoming"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {upcomingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`pb-3 px-1 text-sm sm:text-base font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 select-none whitespace-nowrap ${
              activeTab === "past"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>{t("tabPast")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "past"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {pastList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`pb-3 px-1 text-sm sm:text-base font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 select-none whitespace-nowrap ${
              activeTab === "cancelled"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>{t("tabCancelled")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "cancelled"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {cancelledList.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {currentList.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
              <MdOutlineLuggage size={32} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">
              {activeTab === "upcoming"
                ? t("noUpcoming")
                : activeTab === "past"
                ? t("noPast")
                : t("noCancelled")}
            </h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md">
              {activeTab === "upcoming"
                ? t("noUpcomingDesc")
                : activeTab === "past"
                ? t("noPastDesc")
                : t("noCancelledDesc")}
            </p>
            {activeTab === "upcoming" && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-6 px-6 py-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-semibold transition cursor-pointer shadow-sm"
              >
                {t("startSearching")}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentList.map((res) => {
              const start = new Date(res.startDate);
              const end = new Date(res.endDate);
              const nights = differenceInCalendarDays(end, start) || 1;
              const formattedDates = `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;

              return (
                <div
                  key={res.id}
                  className="border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col bg-white"
                >
                  {/* Photo Container */}
                  <div
                    className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 cursor-pointer group"
                    onClick={() => router.push(`/listings/${res.listing.id}`)}
                  >
                    <Image
                      fill
                      src={res.listing.imageSrc}
                      alt={res.listing.title}
                      className="object-cover group-hover:scale-105 transition duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-3 start-3 z-10">
                      {res.status === "cancelled" ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100/90 text-red-800 backdrop-blur-xs">
                          <MdCancel size={13} />
                          <span>{t("tabCancelled")}</span>
                        </span>
                      ) : activeTab === "past" ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100/90 text-neutral-800 backdrop-blur-xs">
                          <MdHistory size={13} />
                          <span>{t("tabPast")}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 backdrop-blur-xs">
                          <MdCheckCircle size={13} />
                          <span>{t("tabUpcoming")}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        {res.listing.city || res.listing.title}
                      </div>
                      <h4
                        onClick={() => router.push(`/listings/${res.listing.id}`)}
                        className="text-base font-bold text-neutral-900 line-clamp-1 hover:underline cursor-pointer mt-0.5"
                      >
                        {res.listing.title}
                      </h4>
                      <p className="text-xs text-neutral-600 mt-1">{formattedDates}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {nights} {nights === 1 ? tCommon("night") : `${tCommon("night")}s`} ·{" "}
                        {res.guestCount || 1}{" "}
                        {(res.guestCount || 1) === 1 ? tCommon("guest") : tCommon("guests")}
                      </p>
                    </div>

                    {/* Pricing & Host Row */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-neutral-500">{tCommon("total")}</span>
                        <span className="text-sm font-bold text-neutral-900">${res.totalPrice}</span>
                      </div>
                      {res.listing.user && (
                        <div className="flex items-center gap-2">
                          <Avatar src={res.listing.user.image} userName={res.listing.user.name} />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/listings/${res.listing.id}`)}
                        className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 hover:border-neutral-900 text-xs font-semibold text-neutral-800 transition cursor-pointer text-center"
                      >
                        {activeTab === "past" ? t("bookAgain") : t("viewListing")}
                      </button>

                      {activeTab === "upcoming" && (
                        <button
                          type="button"
                          onClick={() => setSelectedForCancel(res)}
                          className="py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                        >
                          {t("cancelAction")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {selectedForCancel && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h3 className="font-bold text-base text-neutral-900">{t("cancelModalTitle")}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedForCancel(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <div className="py-4 flex flex-col gap-3">
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {t("cancelModalDesc", { title: selectedForCancel.listing.title })}
                </p>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-sm mt-1">
                  <span className="text-neutral-700 font-medium">{t("refundAmount")}</span>
                  <span className="font-bold text-emerald-700">${selectedForCancel.totalPrice}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSelectedForCancel(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  {t("keepReservation")}
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={onConfirmCancel}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? tCommon("loading") : t("confirmCancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
