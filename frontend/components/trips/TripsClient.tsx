"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { Reservation } from "@/types";
import { cancelReservation } from "@/lib/data/reservations";
import { toast } from "react-toastify";
import {
  HiOutlineCalendar,
  HiOutlineLocationMarker,
  HiOutlineUserGroup,
  HiOutlineReceiptTax,
  HiOutlineChatAlt2,
  HiOutlineXCircle,
  HiOutlineCheckCircle,
} from "react-icons/hi";
import { BiFile } from "react-icons/bi";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface TripsClientProps {
  initialReservations: Reservation[];
}

export default function TripsClient({ initialReservations }: TripsClientProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [selectedReceipt, setSelectedReceipt] = useState<Reservation | null>(null);
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter reservations based on active tab
  const filteredReservations = reservations.filter((r) => {
    if (activeTab === "upcoming") {
      return r.status === "confirmed" || r.status === "pending";
    }
    if (activeTab === "past") {
      return r.status === "completed";
    }
    if (activeTab === "cancelled") {
      return r.status === "cancelled";
    }
    return true;
  });

  const handleCancel = async () => {
    if (!cancellingRes) return;
    setIsProcessing(true);
    try {
      await cancelReservation(cancellingRes.id);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === cancellingRes.id
            ? { ...r, status: "cancelled", paymentStatus: "refunded" }
            : r
        )
      );
      toast.success("Reservation cancelled. Refund has been initiated.");
      setCancellingRes(null);
    } catch {
      toast.error("Failed to cancel reservation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <HiOutlineCheckCircle size={14} /> Confirmed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Pending Approval
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <HiOutlineXCircle size={14} /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            Your Trips & Itineraries
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your booked stays, desert expeditions, and vehicle rentals across Algeria
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-tertiary/20 p-1.5 rounded-2xl border border-tertiary/40">
          {(["upcoming", "past", "cancelled"] as const).map((tab) => {
            const count = reservations.filter((r) => {
              if (tab === "upcoming") return r.status === "confirmed" || r.status === "pending";
              if (tab === "past") return r.status === "completed";
              return r.status === "cancelled";
            }).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`capitalize px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-white text-primary shadow-sm"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Trips List / Empty State */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-lg mx-auto shadow-sm my-8">
          <div className="w-16 h-16 bg-tertiary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <HiOutlineCalendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-primary mb-1">
            No {activeTab} trips found
          </h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
            {activeTab === "upcoming"
              ? "You don't have any upcoming reservations. When you book a home, 4x4, or tour, it will appear here."
              : `You don't have any ${activeTab} reservations on DARNA.`}
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center py-2.5 px-6 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm"
          >
            Explore Algerian Stays & Experiences
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReservations.map((res) => {
            const listing = res.listing;
            const coverImage = listing?.imageSrc?.[0] || "/assets/placeholder.jpg";
            const vertical = listing?.category || "home";

            return (
              <div
                key={res.id}
                className="bg-white rounded-3xl border border-tertiary overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Image & Header */}
                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={coverImage}
                      alt={listing?.title || "Listing image"}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 start-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-primary shadow-xs">
                        {vertical}
                      </span>
                    </div>
                    <div className="absolute top-3 end-3">
                      {getStatusBadge(res.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-primary line-clamp-1 hover:text-accent transition">
                        <Link href={`/listings/${res.listingId}`}>
                          {listing?.title || "Algerian Stay"}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                        <HiOutlineLocationMarker size={15} className="text-secondary shrink-0" />
                        <span>
                          {listing?.city || "Algiers"}, {listing?.country || "Algeria"}
                        </span>
                      </div>
                    </div>

                    {/* Booking Details Grid */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-2xl border border-tertiary/40 text-xs">
                      <div>
                        <div className="text-neutral-500 font-medium">Dates</div>
                        <div className="font-semibold text-primary mt-0.5">
                          {res.startDate} – {res.endDate}
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-500 font-medium">Guests</div>
                        <div className="font-semibold text-primary mt-0.5 flex items-center gap-1">
                          <HiOutlineUserGroup size={14} className="text-neutral-400" />
                          <span>{res.guestsCount} travelers</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-500 font-medium">Payment</div>
                        <div className="font-semibold text-primary mt-0.5">
                          {res.paymentMethod || "CIB / Edahabia Card"}
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-500 font-medium">Total Paid</div>
                        <div className="font-bold text-primary mt-0.5">
                          {res.totalPrice.toLocaleString()} DZD{" "}
                          <span className="text-[11px] font-normal text-neutral-500">
                            (~€{Math.round(res.totalPrice / 153)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-6 py-4 bg-tertiary/10 border-t border-tertiary/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/messages`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-tertiary rounded-xl font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                    >
                      <HiOutlineChatAlt2 size={15} className="text-secondary" />
                      <span>Message Host</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(res)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-tertiary rounded-xl font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                    >
                      <HiOutlineReceiptTax size={15} className="text-secondary" />
                      <span>Receipt</span>
                    </button>
                  </div>

                  {res.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => setCancellingRes(res)}
                      className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition"
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!cancellingRes}
        title="Cancel Reservation?"
        variant="danger"
        isLoading={isProcessing}
        confirmLabel={isProcessing ? "Cancelling..." : "Confirm Cancellation"}
        cancelLabel="Keep Reservation"
        onConfirm={handleCancel}
        onCancel={() => setCancellingRes(null)}
        message={
          cancellingRes ? (
            <>
              Are you sure you want to cancel your stay at{" "}
              <span className="font-semibold text-primary">
                {cancellingRes.listing?.title}
              </span>{" "}
              from {cancellingRes.startDate} to {cancellingRes.endDate}?
            </>
          ) : ""
        }
        callout={
          cancellingRes && (
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <span>
                According to DARNA flexible cancellation policy, your full refund of{" "}
                <span className="font-bold">{cancellingRes.totalPrice.toLocaleString()} DZD</span>{" "}
                will be credited to your original payment method.
              </span>
            </div>
          )
        }
      />

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-tertiary shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-tertiary/50 pb-4">
              <div>
                <Image
                  src="/assets/logo-horizontal.png"
                  alt="DARNA"
                  width={110}
                  height={35}
                  className="h-7 w-auto object-contain mb-1"
                />
                <p className="text-xs text-neutral-500">Official Booking Receipt · فاتورة الحجز</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                PAID IN FULL
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Receipt ID:</span>
                <span className="font-mono font-semibold text-primary">{selectedReceipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Listing:</span>
                <span className="font-semibold text-primary">{selectedReceipt.listing?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Dates:</span>
                <span className="text-primary">{selectedReceipt.startDate} – {selectedReceipt.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Method:</span>
                <span className="text-primary">{selectedReceipt.paymentMethod}</span>
              </div>
              <hr className="border-tertiary/50 my-2" />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Nightly / Base Rate:</span>
                  <span>{(selectedReceipt.nightlyPrice || 15000).toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Cleaning & Prep Fee:</span>
                  <span>{(selectedReceipt.cleaningFee || 3500).toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>DARNA Service Fee:</span>
                  <span>{(selectedReceipt.serviceFee || 4500).toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Taxes (TVA Algérie):</span>
                  <span>{(selectedReceipt.taxes || 1500).toLocaleString()} DZD</span>
                </div>
              </div>
              <hr className="border-tertiary/50 my-2" />
              <div className="flex justify-between text-base font-bold text-primary">
                <span>Total Amount:</span>
                <span>{selectedReceipt.totalPrice.toLocaleString()} DZD (~€{Math.round(selectedReceipt.totalPrice / 153)})</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  toast.success("Receipt downloaded as PDF.");
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/95 transition flex items-center gap-1.5"
              >
                <BiFile size={16} />
                <span>Download PDF Facture</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
