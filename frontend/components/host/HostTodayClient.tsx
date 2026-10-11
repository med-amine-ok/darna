"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Organization, Reservation, Listing, Review } from "@/types";
import { updateReservationStatus } from "@/lib/data/reservations";
import Avatar from "@/components/Avatar";
import { toast } from "react-toastify";
import {
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineTrendingUp,
  HiOutlineChatAlt2,
  HiOutlineSparkles,
  HiOutlineChevronRight,
  HiOutlineStar,
  HiOutlineClock,
  HiOutlinePlus,
} from "react-icons/hi";
import { BiDoorOpen, BiCheckCircle } from "react-icons/bi";

interface HostTodayClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
  initialReservations: Reservation[];
  listings: Listing[];
  reviews: Review[];
}

export default function HostTodayClient({
  currentUser,
  organization,
  initialReservations,
  listings,
  reviews,
}: HostTodayClientProps) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [period, setPeriod] = useState<"month" | "30days" | "year">("month");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const pendingRequests = reservations.filter((r) => r.status === "pending");
  const confirmedReservations = reservations.filter((r) => r.status === "confirmed");

  // Filter today's check-ins and check-outs (mock dates)
  const todayCheckIns = confirmedReservations.slice(0, 1);
  const currentlyHosting = confirmedReservations.slice(1, 2);

  const totalEarnings = confirmedReservations.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const handleStatusChange = async (id: string, newStatus: "confirmed" | "cancelled") => {
    setIsProcessing(id);
    try {
      await updateReservationStatus(id, newStatus);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      if (newStatus === "confirmed") {
        toast.success("Reservation accepted! Guest confirmed.");
      } else {
        toast.info("Reservation declined.");
      }
    } catch {
      toast.error("Failed to update reservation status.");
    } finally {
      setIsProcessing(null);
    }
  };

  const displayName = organization ? organization.name : currentUser?.name || "Amina";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tertiary/50 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-secondary font-bold">
            {organization ? "Agency Command Center" : "Individual Host Dashboard"}
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-primary font-serif mt-1">
            Marhaban, {displayName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Here is your daily check-in briefing, pending guest requests, and reservation performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/become-a-host/1"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-xs"
          >
            <HiOutlinePlus size={16} />
            <span>Create Listing</span>
          </Link>
          <Link
            href="/host/calendar"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-primary hover:bg-neutral-50 transition shadow-xs"
          >
            <HiOutlineCalendar size={16} className="text-secondary" />
            <span>Calendar</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary font-serif">
            Performance Overview
          </h2>
          <div className="flex items-center gap-1 bg-tertiary/20 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                period === "month" ? "bg-white text-primary shadow-xs" : "text-neutral-600"
              }`}
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => setPeriod("30days")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                period === "30days" ? "bg-white text-primary shadow-xs" : "text-neutral-600"
              }`}
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={() => setPeriod("year")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                period === "year" ? "bg-white text-primary shadow-xs" : "text-neutral-600"
              }`}
            >
              Year to date
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-500">Gross Host Earnings</div>
            <div className="text-xl sm:text-2xl font-bold text-primary font-serif">
              {totalEarnings.toLocaleString()} <span className="text-xs font-sans font-normal">DZD</span>
            </div>
            <div className="text-[11px] text-emerald-700 flex items-center gap-1">
              <HiOutlineTrendingUp size={13} />
              <span>+18.4% from last period (~€{Math.round(totalEarnings / 153).toLocaleString()})</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-500">Occupancy Rate</div>
            <div className="text-xl sm:text-2xl font-bold text-primary">84%</div>
            <div className="text-[11px] text-neutral-400">Above wilaya average (71%)</div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-500">Active Bookings</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {confirmedReservations.length}
            </div>
            <div className="text-[11px] text-neutral-400">Confirmed stays & fleet rentals</div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-tertiary/70 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-neutral-500">Overall Rating</div>
            <div className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-1">
              <HiOutlineStar size={20} className="text-amber-500 fill-amber-500" />
              <span>4.96</span>
            </div>
            <div className="text-[11px] text-neutral-400">Across {reviews.length} guest reviews</div>
          </div>
        </div>
      </div>

      {/* Pending Approval Requests (If Any) */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-lg font-bold text-primary font-serif">
              Action Needed: Pending Booking Requests ({pendingRequests.length})
            </h2>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-amber-200 text-amber-700 font-bold shrink-0">
                    <HiOutlineClock size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-sm sm:text-base">
                      Booking request for {req.listing?.title}
                    </h3>
                    <div className="text-xs text-neutral-600 mt-0.5">
                      Dates: <strong>{req.startDate} – {req.endDate}</strong> · {req.guestsCount} guests · Payout:{" "}
                      <strong>{req.totalPrice.toLocaleString()} DZD</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    disabled={isProcessing === req.id}
                    onClick={() => handleStatusChange(req.id, "confirmed")}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  >
                    <HiOutlineCheck size={16} />
                    <span>Accept Request</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing === req.id}
                    onClick={() => handleStatusChange(req.id, "cancelled")}
                    className="px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-50 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <HiOutlineX size={16} />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Today's Schedule & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Today's Movements */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-5">
            <h2 className="text-xl font-bold text-primary font-serif flex items-center gap-2">
              <BiDoorOpen size={24} className="text-secondary" />
              <span>Today&apos;s Stays & Check-ins</span>
            </h2>

            {todayCheckIns.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-tertiary/40 text-xs text-neutral-500">
                No guest check-ins scheduled for today.
              </div>
            ) : (
              <div className="space-y-3">
                {todayCheckIns.map((stay) => (
                  <div
                    key={stay.id}
                    className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-200">
                        <Image
                          src={stay.listing?.imageSrc?.[0] || "/assets/placeholder.jpg"}
                          alt="Stay"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          Check-in at 14:00
                        </span>
                        <h4 className="font-bold text-primary text-sm mt-1">
                          {stay.listing?.title}
                        </h4>
                        <div className="text-xs text-neutral-500">
                          {stay.guestsCount} travelers · Check-in confirmed
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/host/messages"
                      className="px-3 py-1.5 bg-white border border-tertiary rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition shrink-0"
                    >
                      Message Guest
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Currently Hosting */}
            <div className="pt-4 border-t border-tertiary/40">
              <h3 className="font-bold text-primary text-sm mb-3">
                Currently Hosting ({currentlyHosting.length})
              </h3>
              {currentlyHosting.map((stay) => (
                <div
                  key={stay.id}
                  className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-semibold text-primary text-sm">
                      {stay.listing?.title}
                    </h4>
                    <div className="text-xs text-neutral-500">
                      Stay ends on {stay.endDate}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">Active In-House</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary font-serif">
                Recent Guest Reviews
              </h2>
              <span className="text-xs text-secondary font-semibold hover:underline">
                View all reviews
              </span>
            </div>

            <div className="divide-y divide-tertiary/30">
              {reviews.slice(0, 2).map((rev) => (
                <div key={rev.id} className="py-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar src={rev.user?.image} size={28} />
                      <span className="font-bold text-primary">{rev.user?.name}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-primary">
                      <HiOutlineStar size={14} className="text-amber-500 fill-amber-500" />
                      <span>{rev.rating}.0</span>
                    </div>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Shortcuts & Quick Hub */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Hub Links */}
          <div className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-3">
            <h3 className="font-bold text-primary text-base font-serif">Quick Actions</h3>

            <Link
              href="/host/calendar"
              className="p-3 bg-neutral-50 hover:bg-tertiary/20 rounded-2xl border border-tertiary/50 flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-2.5">
                <HiOutlineCalendar size={18} className="text-secondary" />
                <span className="text-xs font-bold text-primary">Block Dates or Override Rates</span>
              </div>
              <HiOutlineChevronRight size={16} className="text-neutral-400 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              href="/host/listings"
              className="p-3 bg-neutral-50 hover:bg-tertiary/20 rounded-2xl border border-tertiary/50 flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-2.5">
                <Image
                  src="/assets/house.png"
                  alt="Listings"
                  width={18}
                  height={18}
                  className="object-contain shrink-0"
                />
                <span className="text-xs font-bold text-primary">Manage Your Listings ({listings.length})</span>
              </div>
              <HiOutlineChevronRight size={16} className="text-neutral-400 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              href="/host/messages"
              className="p-3 bg-neutral-50 hover:bg-tertiary/20 rounded-2xl border border-tertiary/50 flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-2.5">
                <HiOutlineChatAlt2 size={18} className="text-secondary" />
                <span className="text-xs font-bold text-primary">Check Guest Messages</span>
              </div>
              <HiOutlineChevronRight size={16} className="text-neutral-400 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              href="/host/settings"
              className="p-3 bg-neutral-50 hover:bg-tertiary/20 rounded-2xl border border-tertiary/50 flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-2.5">
                <HiOutlineCash size={18} className="text-secondary" />
                <span className="text-xs font-bold text-primary">Payout Account & RIB</span>
              </div>
              <HiOutlineChevronRight size={16} className="text-neutral-400 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          {/* Hosting Guide Tip */}
          <div className="bg-primary text-white rounded-3xl p-6 space-y-3 shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-tertiary font-bold">
              Algerian Host Tip
            </span>
            <h4 className="font-bold text-sm font-serif">
              Winter Sahara Season is High Demand
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Expeditions and 4x4 rentals across Djanet and Taghit see an 85% surge between November and March. Adjust your calendar prices accordingly.
            </p>
            <Link
              href="/host/calendar"
              className="inline-block text-xs font-bold text-accent hover:underline pt-1"
            >
              Open Pricing Calendar →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
