"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Reservation } from "@/types";
import { updateReservationStatus, cancelReservation } from "@/lib/data/reservations";
import { logAdminAction } from "@/lib/data/admin";
import {
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlineBan,
  HiOutlineRefresh,
  HiOutlineExclamation,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineCheck,
} from "react-icons/hi";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";

interface AdminBookingsClientProps {
  initialReservations: Reservation[];
}

export default function AdminBookingsClient({ initialReservations }: AdminBookingsClientProps) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [forceCancellingId, setForceCancellingId] = useState<string | null>(null);
  const [isForceCancelling, setIsForceCancelling] = useState(false);

  // Admin notes state
  const [adminNote, setAdminNote] = useState("");
  const [notesHistory, setNotesHistory] = useState<Record<string, string[]>>({
    res_oran_04: ["Refund authorized due to host property maintenance emergency."],
  });

  // Filtered
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const guestName = (r.user?.name || "").toLowerCase();
        const listingTitle = (r.listing?.title || "").toLowerCase();
        if (!r.id.toLowerCase().includes(q) && !guestName.includes(q) && !listingTitle.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [reservations, statusFilter, searchQuery]);

  // Actions
  const handleForceCancel = (id: string) => {
    setForceCancellingId(id);
  };

  const executeForceCancel = async () => {
    if (!forceCancellingId) return;
    setIsForceCancelling(true);
    try {
      const success = await cancelReservation(forceCancellingId);
      if (success) {
        setReservations((prev) =>
          prev.map((r) => (r.id === forceCancellingId ? { ...r, status: "cancelled", paymentStatus: "refunded" } : r))
        );
        logAdminAction("FORCE_CANCEL_BOOKING", "booking", forceCancellingId, `Admin force-cancelled reservation ${forceCancellingId}`);
        toast.info("Booking cancelled and refund queued.");
        if (selectedBooking?.id === forceCancellingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, status: "cancelled", paymentStatus: "refunded" } : null));
        }
      }
    } catch {
      toast.error("Failed to cancel booking.");
    } finally {
      setIsForceCancelling(false);
      setForceCancellingId(null);
    }
  };

  const handleMockRefund = (id: string) => {
    toast.success("SATIM Edahabia electronic refund transaction emitted (Batch DZ-REF-8941)");
    logAdminAction("MOCK_REFUND", "booking", id, `Issued SATIM electronic refund for reservation ${id}`);
  };

  const handleFlagDispute = (id: string) => {
    toast.warning("Booking flagged as under formal dispute resolution.");
    logAdminAction("FLAG_DISPUTE", "booking", id, `Flagged booking ${id} for arbitration`);
  };

  const handleAddNote = (id: string) => {
    if (!adminNote.trim()) return;
    setNotesHistory((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), `${new Date().toLocaleDateString("fr-DZ")}: ${adminNote}`],
    }));
    toast.success("Internal admin note saved.");
    setAdminNote("");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Bookings & Transactions Oversight
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Audit all reservations, inspect SATIM payment records, and resolve guest-host disputes.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-tertiary/70 shadow-2xs">
          <span className="text-xs font-bold text-neutral-500 uppercase">Total Volume:</span>
          <span className="font-mono font-black text-primary">
            {reservations.reduce((sum, r) => sum + r.totalPrice, 0).toLocaleString()} DZD
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <HiOutlineSearch size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reservation ID, guest, or stay..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="admin-booking-status" className="sr-only">Booking Status</label>
          <select
            id="admin-booking-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">Code / ID</th>
                <th className="py-3 px-4 text-start">Guest</th>
                <th className="py-3 px-4 text-start">Property</th>
                <th className="py-3 px-4 text-start">Dates</th>
                <th className="py-3 px-4 text-end">Gross Total</th>
                <th className="py-3 px-4 text-start">Payment Channel</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {filtered.map((res) => (
                <tr key={res.id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-neutral-500 whitespace-nowrap">{res.id}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                        <Image src={res.user?.image || "/assets/avatar.png"} alt="Guest" fill className="object-cover" />
                      </div>
                      <span className="font-bold text-primary">{res.user?.name || "Guest"}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-neutral-700 truncate max-w-[180px]">
                    {res.listing?.title}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                    {res.startDate} → {res.endDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-primary text-end whitespace-nowrap">
                    {res.totalPrice.toLocaleString()} DZD
                  </td>
                  <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                    {res.paymentMethod || "CIB / Edahabia"}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        res.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : res.status === "completed"
                          ? "bg-neutral-100 text-neutral-700"
                          : res.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {res.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-end whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(res)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1 ms-auto"
                    >
                      <HiOutlineEye size={14} />
                      <span>Audit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Audit Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60 mb-6">
              <div>
                <span className="text-xs font-mono font-bold text-neutral-400">{selectedBooking.id}</span>
                <h3 className="font-serif text-xl font-black text-primary">Booking Administrative Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Guest & Host Mini-Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-neutral-50 rounded-2xl p-4 border border-tertiary/60">
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Guest</span>
                <div className="font-bold text-primary">{selectedBooking.user?.name}</div>
                <div className="text-xs text-neutral-500 font-mono mt-0.5">{selectedBooking.user?.phone || "+213 550 12 34 56"}</div>
                <div className="text-xs text-neutral-500 truncate">{selectedBooking.user?.email || "guest@darna.dz"}</div>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-4 border border-tertiary/60">
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Listing & Host</span>
                <div className="font-bold text-primary truncate">{selectedBooking.listing?.title}</div>
                <div className="text-xs text-neutral-500">{selectedBooking.listing?.city}, Algeria</div>
                <div className="text-xs text-neutral-500 font-mono">Host ID: {selectedBooking.listing?.hostUserId || selectedBooking.listing?.organizationId}</div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 mb-6 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-primary">
                <span>Guest Total Paid</span>
                <span className="font-mono">{selectedBooking.totalPrice.toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Net Host Payout (97%)</span>
                <span className="font-mono">{Math.round(selectedBooking.totalPrice * 0.97).toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>DARNA Platform Take (3% Host + 7% Guest Fee)</span>
                <span className="font-mono">{Math.round(selectedBooking.totalPrice * 0.1).toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between text-neutral-400 pt-2 border-t border-primary/15 font-mono text-[11px]">
                <span>SATIM Clearance Reference</span>
                <span>DZ-SATIM-2026-X88921</span>
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex flex-wrap gap-2 pb-6 border-b border-tertiary/40 mb-6">
              <button
                type="button"
                onClick={() => handleMockRefund(selectedBooking.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <HiOutlineRefresh size={14} />
                <span>Issue SATIM Refund</span>
              </button>
              <button
                type="button"
                onClick={() => handleFlagDispute(selectedBooking.id)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <HiOutlineExclamation size={14} />
                <span>Flag Dispute</span>
              </button>
              {selectedBooking.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={() => handleForceCancel(selectedBooking.id)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <HiOutlineBan size={14} />
                  <span>Force Cancel</span>
                </button>
              )}
            </div>

            {/* Internal Admin Notes */}
            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Internal Administrative Notes & Audit Remarks
              </label>
              {(notesHistory[selectedBooking.id] || []).map((n, i) => (
                <div key={i} className="text-xs bg-neutral-50 p-2 rounded-lg mb-1.5 border border-tertiary/40 text-neutral-700">
                  {n}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Add note for admin records..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleAddNote(selectedBooking.id)}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Force-Cancel Booking Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!forceCancellingId}
        variant="destructive"
        title="Force-Cancel Reservation"
        message="Are you sure you want to administratively force-cancel this reservation? Both host and traveler will be immediately notified, and a full DZD refund will be triggered."
        callout="Admin override action: Host cancellation penalty policies will be bypassed."
        confirmLabel="Force-cancel booking"
        cancelLabel="Keep booking"
        isLoading={isForceCancelling}
        onConfirm={executeForceCancel}
        onCancel={() => setForceCancellingId(null)}
      />
    </div>
  );
}
