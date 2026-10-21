"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Reservation } from "@/types";
import { updateReservationStatus } from "@/lib/data/reservations";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import {
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandMessageIcon,
  BrandCheckIcon,
  BrandCloseIcon,
  BrandSearchIcon,
} from "@/components/icons";

interface ReservationsClientProps {
  initialReservations: Reservation[];
}

export default function ReservationsClient({
  initialReservations,
}: ReservationsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // Filter reservations
  const filtered = reservations.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const listingTitle = r.listing?.title.toLowerCase() || "";
      const id = r.id.toLowerCase();
      if (!listingTitle.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  // Calculate Host KPIs
  const totalRevenue = reservations
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((acc, curr) => acc + curr.totalPrice, 0);
  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;

  const handleStatusChange = async (
    id: string,
    newStatus: "confirmed" | "cancelled"
  ) => {
    setIsProcessing(id);
    try {
      await updateReservationStatus(id, newStatus);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      if (newStatus === "confirmed") {
        toast.success("Booking request accepted! Guest notified.");
      } else {
        toast.info("Booking request declined.");
      }
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            Host Reservations & Bookings
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Track guest bookings, accept pending requests, and manage payouts across your Algerian stays
          </p>
        </div>

        <Link
          href="/properties"
          className="inline-flex items-center justify-center px-4 py-2 bg-white border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-50 transition shadow-xs"
        >
          Manage Listed Properties
        </Link>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Confirmed Revenue</div>
          <div className="text-xl sm:text-2xl font-bold text-primary mt-1 font-serif">
            {totalRevenue.toLocaleString()} <span className="text-xs font-sans font-normal">DZD</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            ~€{Math.round(totalRevenue / 153).toLocaleString()}
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Confirmed Bookings</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {confirmedCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Active or upcoming</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Pending Requests</div>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${pendingCount > 0 ? "text-amber-600" : "text-neutral-700"}`}>
            {pendingCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Needs your action</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Occupancy Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-primary mt-1">
            82%
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Average across properties</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-tertiary/20 p-1.5 rounded-2xl border border-tertiary/40">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "confirmed", label: "Confirmed" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterStatus === tab.id
                  ? "bg-white text-primary shadow-xs"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <BrandSearchIcon
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by property or ID..."
            className="w-full ps-9 pe-4 py-2 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Reservation Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-md mx-auto my-6 shadow-xs">
          <BrandCalendarIcon size={36} className="text-tertiary mx-auto mb-3" />
          <h3 className="text-base font-bold text-primary">No reservations found</h3>
          <p className="text-xs text-neutral-500 mt-1">
            No bookings match the selected status filter or search query.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((res) => {
            const listing = res.listing;
            const coverImage = listing?.imageSrc?.[0] || "/assets/placeholder.jpg";

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-tertiary p-5 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                    <Image
                      src={coverImage}
                      alt={listing?.title || "Property"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold text-neutral-400 uppercase">
                        #{res.id}
                      </span>
                      {res.status === "confirmed" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Confirmed
                        </span>
                      )}
                      {res.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          Awaiting Approval
                        </span>
                      )}
                      {res.status === "completed" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700">
                          Completed
                        </span>
                      )}
                      {res.status === "cancelled" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-primary text-sm sm:text-base line-clamp-1 hover:text-accent transition">
                      <Link href={`/listings/${res.listingId}`}>
                        {listing?.title || "Algerian Property"}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>{res.startDate} – {res.endDate}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <BrandUsersIcon size={14} />
                        {res.guestsCount} guests
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Payout and Actions */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-tertiary/40">
                  <div className="text-start md:text-end">
                    <div className="text-xs text-neutral-400">Host Payout</div>
                    <div className="font-bold text-primary text-base sm:text-lg">
                      {res.totalPrice.toLocaleString()} DZD
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {res.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing === res.id}
                          onClick={() => handleStatusChange(res.id, "confirmed")}
                          className="px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <BrandCheckIcon size={15} />
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing === res.id}
                          onClick={() => setDecliningId(res.id)}
                          className="px-3.5 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-50 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <BrandCloseIcon size={15} />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/messages`)}
                        className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <BrandMessageIcon size={15} />
                        <span>Message</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Booking Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!decliningId}
        variant="destructive"
        title="Decline Booking Request"
        message="Are you sure you want to decline this reservation request? The guest will be informed immediately and their temporary hold will be released."
        confirmLabel="Decline request"
        cancelLabel="Keep request"
        isLoading={isProcessing === decliningId}
        onConfirm={async () => {
          if (decliningId) {
            await handleStatusChange(decliningId, "cancelled");
            setDecliningId(null);
          }
        }}
        onCancel={() => setDecliningId(null)}
      />
    </div>
  );
}
