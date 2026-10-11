"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { Reservation, Listing, User } from "@/types";
import { updateReservationStatus, cancelReservation } from "@/lib/data/reservations";
import {
  HiOutlineCalendar,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineDocumentText,
  HiOutlineChatAlt2,
  HiOutlineCash,
  HiOutlineInformationCircle,
  HiOutlineEye,
} from "react-icons/hi";
import { FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";

interface HostBookingsClientProps {
  initialReservations: Reservation[];
  hostListings: Listing[];
  currentUser?: User | null;
}

type TabType = "all" | "upcoming" | "current" | "past" | "cancelled" | "pending";

export default function HostBookingsClient({
  initialReservations,
  hostListings,
  currentUser,
}: HostBookingsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [selectedTab, setSelectedTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<string>("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper to categorize reservation
  const getReservationCategory = (res: Reservation): TabType => {
    if (res.status === "cancelled") return "cancelled";
    if (res.status === "pending") return "pending";
    if (res.status === "completed") return "past";
    if (res.endDate < todayStr) return "past";
    if (res.startDate <= todayStr && res.endDate >= todayStr) return "current";
    return "upcoming";
  };

  // Tab counts
  const counts = useMemo(() => {
    const resCounts: Record<TabType, number> = {
      all: reservations.length,
      upcoming: 0,
      current: 0,
      past: 0,
      cancelled: 0,
      pending: 0,
    };

    reservations.forEach((r) => {
      const cat = getReservationCategory(r);
      resCounts[cat] = (resCounts[cat] || 0) + 1;
    });

    return resCounts;
  }, [reservations, todayStr]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      // Tab filter
      if (selectedTab !== "all") {
        const cat = getReservationCategory(res);
        if (cat !== selectedTab) return false;
      }

      // Listing filter
      if (selectedListingId !== "all" && res.listingId !== selectedListingId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const guestName = (res.user?.name || "").toLowerCase();
        const listingTitle = (res.listing?.title || "").toLowerCase();
        const code = res.id.toLowerCase();
        if (!guestName.includes(q) && !listingTitle.includes(q) && !code.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, selectedTab, selectedListingId, searchQuery, todayStr]);

  // Action handlers
  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await updateReservationStatus(id, "confirmed");
      if (updated) {
        setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "confirmed" } : r)));
        toast.success("Reservation confirmed! Guest has been notified via SMS & Email.");
      }
    } catch {
      toast.error("Failed to confirm reservation.");
    } finally {
      setActionLoading(null);
    }
  };

  const executeDecline = async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await updateReservationStatus(id, "cancelled");
      if (updated) {
        setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
        toast.info("Reservation request declined.");
      }
    } catch {
      toast.error("Failed to decline reservation.");
    } finally {
      setActionLoading(null);
      setDecliningId(null);
    }
  };

  const handleDecline = (id: string) => {
    setDecliningId(id);
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      const success = await cancelReservation(id);
      if (success) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "cancelled", paymentStatus: "refunded" } : r))
        );
        toast.info("Reservation cancelled according to host cancellation policy.");
        setCancellingId(null);
        if (selectedReservation?.id === id) {
          setSelectedReservation(null);
        }
      }
    } catch {
      toast.error("Failed to cancel reservation.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Host Reservations
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Manage incoming booking requests, guest check-ins, and DZD net payouts across your fleet.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-tertiary/70 rounded-2xl px-4 py-2.5 shadow-2xs text-center">
            <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Stays
            </span>
            <span className="text-lg font-black text-primary">{reservations.length}</span>
          </div>
          <div className="bg-white border border-tertiary/70 rounded-2xl px-4 py-2.5 shadow-2xs text-center">
            <span className="block text-xs font-bold text-amber-600 uppercase tracking-wider">
              Pending
            </span>
            <span className="text-lg font-black text-amber-600">{counts.pending}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-tertiary/60 overflow-x-auto pb-1 mb-6 scrollbar-none">
        {(
          [
            { id: "all", label: "All Bookings", count: counts.all },
            { id: "pending", label: "Pending Requests", count: counts.pending },
            { id: "upcoming", label: "Upcoming", count: counts.upcoming },
            { id: "current", label: "Currently Hosting", count: counts.current },
            { id: "past", label: "Completed", count: counts.past },
            { id: "cancelled", label: "Cancelled", count: counts.cancelled },
          ] as { id: TabType; label: string; count: number }[]
        ).map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                  : "border-transparent text-neutral-500 hover:text-primary hover:border-tertiary"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : tab.id === "pending" && tab.count > 0
                    ? "bg-amber-100 text-amber-700 animate-pulse"
                    : "bg-tertiary/40 text-neutral-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Listing Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 mb-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <HiOutlineSearch
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest name, listing, or reservation ID..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Listing Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="listing-filter-select" className="text-xs font-bold text-neutral-500 whitespace-nowrap flex items-center gap-1">
            <HiOutlineFilter size={14} /> Filter listing:
          </label>
          <select
            id="listing-filter-select"
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Properties ({hostListings.length})</option>
            {hostListings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title} ({listing.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookings List */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tertiary/70 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4 text-secondary">
            <HiOutlineCalendar size={32} />
          </div>
          <h3 className="font-serif text-lg font-bold text-primary mb-1">
            No reservations found
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto mb-4">
            {searchQuery || selectedListingId !== "all" || selectedTab !== "all"
              ? "No reservations match your current filters or search query."
              : "You do not have any bookings in this section yet."}
          </p>
          {(searchQuery || selectedListingId !== "all" || selectedTab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedListingId("all");
                setSelectedTab("all");
              }}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((res) => {
            const guest = res.user;
            const listing = res.listing;
            const cat = getReservationCategory(res);
            const netPayout = Math.round(res.totalPrice * 0.97); // 3% DARNA platform commission

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-tertiary/70 p-4 sm:p-6 shadow-2xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left: Guest & Listing Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  {/* Listing thumbnail */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-100 border border-tertiary/50">
                    <Image
                      src={
                        listing?.imageSrc?.[0] ||
                        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
                      }
                      alt={listing?.title || "Listing"}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-mono font-bold text-neutral-400">
                        {res.id}
                      </span>
                      {/* Status Badges */}
                      {res.status === "pending" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          Pending Host Confirmation
                        </span>
                      )}
                      {res.status === "confirmed" && cat === "current" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ● Currently In Stay
                        </span>
                      )}
                      {res.status === "confirmed" && cat === "upcoming" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          Confirmed Upcoming
                        </span>
                      )}
                      {res.status === "completed" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                          Completed
                        </span>
                      )}
                      {res.status === "cancelled" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Cancelled ({res.paymentStatus === "refunded" ? "Refunded" : "No refund"})
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-primary text-base sm:text-lg truncate mb-1">
                      {listing?.title || "Algerian Stay"}
                    </h4>

                    {/* Guest info row */}
                    <div className="flex items-center gap-2 text-xs text-neutral-600 mb-2">
                      <div className="relative w-5 h-5 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                        <Image
                          src={guest?.image || "/assets/avatar.png"}
                          alt={guest?.name || "Guest"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="font-bold text-primary">{guest?.name || "Guest"}</span>
                      <FaCheckCircle className="text-secondary text-[11px]" title="ID Verified" />
                      <span>•</span>
                      <span>{res.guestsCount} guests</span>
                    </div>

                    {/* Dates & duration */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                      <HiOutlineCalendar size={15} className="text-secondary shrink-0" />
                      <span>
                        {new Date(res.startDate).toLocaleDateString("fr-DZ", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        –{" "}
                        {new Date(res.endDate).toLocaleDateString("fr-DZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Financials */}
                <div className="lg:text-end border-t lg:border-t-0 pt-3 lg:pt-0 border-tertiary/50">
                  <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Host Net Payout
                  </span>
                  <div className="text-lg font-black text-primary">
                    {netPayout.toLocaleString()} DZD
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Gross: {res.totalPrice.toLocaleString()} DZD (3% fee)
                  </span>
                  <div className="mt-1">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        res.paymentStatus === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : res.paymentStatus === "refunded"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      Payment: {res.paymentStatus || "paid"}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {res.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(res.id)}
                        disabled={actionLoading === res.id}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <HiOutlineCheckCircle size={16} />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(res.id)}
                        disabled={actionLoading === res.id}
                        className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <HiOutlineXCircle size={16} />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedReservation(res)}
                        className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <HiOutlineEye size={15} />
                        <span>Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/host/messages`)}
                        className="p-2 border border-tertiary/80 hover:bg-neutral-50 text-neutral-700 rounded-xl transition"
                        title="Message guest"
                      >
                        <HiOutlineChatAlt2 size={18} />
                      </button>

                      {res.status === "confirmed" && cat !== "past" && (
                        <button
                          type="button"
                          onClick={() => setCancellingId(res.id)}
                          className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition"
                          title="Cancel reservation"
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60 mb-6">
              <div>
                <span className="text-[11px] font-mono font-bold text-neutral-400">
                  {selectedReservation.id}
                </span>
                <h3 className="font-serif text-xl font-black text-primary">
                  Reservation Details & Facture
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Guest details section */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-tertiary/60 mb-6">
              <span className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                Guest Profile & Contact
              </span>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-200">
                  <Image
                    src={selectedReservation.user?.image || "/assets/avatar.png"}
                    alt={selectedReservation.user?.name || "Guest"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-primary text-base">
                    <span>{selectedReservation.user?.name || "Guest"}</span>
                    <FaCheckCircle className="text-secondary text-xs" />
                  </div>
                  <span className="text-xs text-neutral-500">
                    Verified Algerian Explorer • Member since 2024
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-700 bg-white p-2.5 rounded-xl border border-tertiary/40">
                  <HiOutlinePhone size={16} className="text-secondary" />
                  <span className="font-mono">{selectedReservation.user?.phone || "+213 550 12 34 56"}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 bg-white p-2.5 rounded-xl border border-tertiary/40">
                  <HiOutlineMail size={16} className="text-secondary" />
                  <span className="truncate">{selectedReservation.user?.email || "guest@darna.dz"}</span>
                </div>
              </div>
            </div>

            {/* Stays info */}
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-tertiary/30">
                <span className="text-neutral-500">Listing</span>
                <span className="font-bold text-primary">
                  {selectedReservation.listing?.title}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-tertiary/30">
                <span className="text-neutral-500">Dates</span>
                <span className="font-bold text-primary">
                  {selectedReservation.startDate} to {selectedReservation.endDate}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-tertiary/30">
                <span className="text-neutral-500">Number of Guests</span>
                <span className="font-bold text-primary">
                  {selectedReservation.guestsCount} guests
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-tertiary/30">
                <span className="text-neutral-500">Payment Channel</span>
                <span className="font-bold text-primary">
                  {selectedReservation.paymentMethod || "CIB / Edahabia Card (SATIM)"}
                </span>
              </div>
            </div>

            {/* Financial Payout Breakdown */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 mb-6">
              <span className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                Payout Breakdown (DZD)
              </span>
              <div className="space-y-1.5 text-xs text-neutral-700">
                <div className="flex justify-between">
                  <span>Guest Gross Total</span>
                  <span className="font-bold font-mono">
                    {selectedReservation.totalPrice.toLocaleString()} DZD
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Cleaning Fee included</span>
                  <span className="font-mono">
                    {(selectedReservation.cleaningFee || 3500).toLocaleString()} DZD
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>DARNA Platform Host Fee (3%)</span>
                  <span className="font-mono font-bold">
                    - {Math.round(selectedReservation.totalPrice * 0.03).toLocaleString()} DZD
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-primary pt-2 border-t border-primary/20">
                  <span>Your Net Payout</span>
                  <span className="font-mono">
                    {Math.round(selectedReservation.totalPrice * 0.97).toLocaleString()} DZD
                  </span>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  toast.success("Facture PDF downloaded (Facture-DARNA-" + selectedReservation.id + ".pdf)");
                }}
                className="w-full sm:w-auto px-4 py-2.5 border border-tertiary/80 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <HiOutlineDocumentText size={16} />
                <span>Download Official Facture</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!decliningId}
        variant="destructive"
        title="Decline Booking Request"
        message="Are you sure you want to decline this booking request? The guest will be notified immediately and no charge will be captured."
        confirmLabel="Decline request"
        cancelLabel="Keep request"
        isLoading={actionLoading === decliningId}
        onConfirm={() => {
          if (decliningId) executeDecline(decliningId);
        }}
        onCancel={() => setDecliningId(null)}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!cancellingId}
        variant="destructive"
        title="Confirm Host Cancellation"
        message="Cancelling a confirmed reservation will notify the guest immediately and issue an automatic SATIM Edahabia/CIB refund. Frequent cancellations can affect your Superhost standing on DARNA."
        callout="DARNA host policy guarantees a full refund to the guest if the host cancels."
        confirmLabel="Cancel booking"
        cancelLabel="Keep reservation"
        isLoading={actionLoading === cancellingId}
        onConfirm={() => {
          if (cancellingId) handleCancel(cancellingId);
        }}
        onCancel={() => setCancellingId(null)}
      />
    </div>
  );
}
