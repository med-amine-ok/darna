"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  HiOutlineCash,
  HiOutlineCalendar,
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineTrendingUp,
  HiOutlineExclamationCircle,
  HiOutlineBadgeCheck,
  HiOutlineEye,
  HiOutlineArrowRight,
  HiOutlineSparkles,
} from "react-icons/hi";

interface AdminDashboardClientProps {
  kpis: {
    platformNetRevenueDzd: number;
    totalGrossVolumeDzd: number;
    totalBookings: number;
    activeListings: number;
    totalUsers: number;
    hostCount: number;
    guestCount: number;
    avgBookingValueDzd: number;
    occupancyRatePercent: number;
    trends: {
      revenue: string;
      bookings: string;
      listings: string;
      users: string;
      occupancy: string;
    };
  };
  charts: {
    monthlyRevenue: Array<{ month: string; revenue: number; bookings: number; signups: number }>;
    bookingsByStatus: Array<{ name: string; value: number; fill: string }>;
    listingsByType: Array<{ type: string; count: number; fill: string }>;
    bookingsByWilaya: Array<{ wilaya: string; bookings: number }>;
  };
}

export default function AdminDashboardClient({ kpis, charts }: AdminDashboardClientProps) {
  const [period, setPeriod] = useState("30d");

  // Multiplier for responsive date selector demo
  const multiplier = period === "7d" ? 0.3 : period === "90d" ? 2.4 : 1;

  const currentRevenue = Math.round(kpis.platformNetRevenueDzd * multiplier);
  const currentVolume = Math.round(kpis.totalGrossVolumeDzd * multiplier);
  const currentBookings = Math.round(kpis.totalBookings * multiplier);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Header & Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Platform Command Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Real-time analytics, marketplace gross merchandise value (GMV), and operations across Algeria.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs self-start md:self-auto">
          {[
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "90d", label: "90 Days" },
            { id: "1y", label: "Year to Date" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === item.id
                  ? "bg-primary text-white shadow-2xs"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Revenue */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Net Platform Revenue
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {kpis.trends.revenue}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-primary">
            {currentRevenue.toLocaleString()} DZD
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            GMV: {currentVolume.toLocaleString()} DZD (10% total fee)
          </div>
        </div>

        {/* Card 2: Bookings */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Stays Booked
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {kpis.trends.bookings}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-primary">
            {currentBookings} stays
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Avg Stay Value: {kpis.avgBookingValueDzd.toLocaleString()} DZD
          </div>
        </div>

        {/* Card 3: Active Fleet */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center">
              <Image
                src="/assets/house.png"
                alt="Listings"
                width={16}
                height={16}
                className="object-contain inline-block me-1.5"
              />
              <span>Active Listings</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {kpis.trends.listings}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-primary">
            {kpis.activeListings} online
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Fleet Occupancy: {kpis.occupancyRatePercent}%
          </div>
        </div>

        {/* Card 4: Users Split */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Users
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {kpis.trends.users}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-primary">
            {kpis.totalUsers} registered
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {kpis.guestCount} Travelers • {kpis.hostCount} Hosts & Agencies
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue & Volume Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">
                Gross Marketplace Revenue Trend
              </h3>
              <p className="text-xs text-neutral-500">
                Monthly revenue processed across all Algerian wilayas (in DZD)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-accent font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Revenue (DZD)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C96F4F" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C96F4F" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [`${val.toLocaleString()} DZD`, "Revenue"]}
                  contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "12px", color: "#fff", border: "none" }}
                  itemStyle={{ color: "#F8F6EE" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C96F4F"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Category Breakdown Pie */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary mb-1">
              Listings by Vertical
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Distribution across Homes, Sahara Expeditions & 4x4s
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.listingsByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={40}
                    paddingAngle={4}
                  >
                    {charts.listingsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "12px", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-tertiary/50 text-xs">
            {charts.listingsByType.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-neutral-700">{item.type}</span>
                </div>
                <span className="font-bold text-primary">{item.count} items</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wilaya Demand Bar Chart */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">
              Bookings by Algerian Wilaya & Destination
            </h3>
            <p className="text-xs text-neutral-500">
              Regional booking density across high-demand tourism hubs
            </p>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.bookingsByWilaya} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
              <XAxis dataKey="wilaya" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "12px", color: "#fff" }}
              />
              <Bar dataKey="bookings" fill="#6B7F5B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Section: Action Needed & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Needed Panel */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-tertiary/60">
            <div className="flex items-center gap-2">
              <HiOutlineExclamationCircle size={20} className="text-amber-600" />
              <h3 className="font-serif text-lg font-bold text-primary">
                Action Needed (3 Items)
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Pending Review
            </span>
          </div>

          <div className="space-y-3">
            {/* Action 1 */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start justify-between gap-3">
              <div>
                <span className="block font-bold text-xs text-amber-900">
                  Tourism Agency Verification Pending
                </span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Atlas Escapes SARL submitted commercial register RC: DZ-ALG-2021-B-89412
                </p>
              </div>
              <Link
                href="/admin/users"
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition"
              >
                Review
              </Link>
            </div>

            {/* Action 2 */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-tertiary/60 flex items-start justify-between gap-3">
              <div>
                <span className="block font-bold text-xs text-primary">
                  Review Flagged by Host
                </span>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Host Karim flagged a 2-star review on Constantine Cliff Residence
                </p>
              </div>
              <Link
                href="/admin/reviews"
                className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shrink-0 transition"
              >
                Moderate
              </Link>
            </div>

            {/* Action 3 */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-tertiary/60 flex items-start justify-between gap-3">
              <div>
                <span className="block font-bold text-xs text-primary">
                  SATIM Card Refund Audit
                </span>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Reservation res_oran_04 completed 48,000 DZD reimbursement
                </p>
              </div>
              <Link
                href="/admin/bookings"
                className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-bold shrink-0 transition"
              >
                Details
              </Link>
            </div>
          </div>
        </div>

        {/* Top Performing Listings */}
        <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-tertiary/60">
            <h3 className="font-serif text-lg font-bold text-primary">
              Top Curated Stays
            </h3>
            <Link
              href="/admin/listings"
              className="text-xs font-bold text-secondary hover:text-primary transition flex items-center gap-1"
            >
              <span>Fleet catalog</span>
              <HiOutlineArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "lst_tipaza_villa",
                title: "Mediterranean Villa overlooking Roman Ruins",
                city: "Tipaza",
                revenue: "925,000 DZD",
                rating: 4.96,
                image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
              },
              {
                id: "lst_algiers_casbah",
                title: "Restored Historic Riad in Casbah of Algiers",
                city: "Algiers",
                revenue: "630,000 DZD",
                rating: 4.91,
                image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
              },
              {
                id: "lst_oran_seafront",
                title: "Panoramic Seafront Penthouse in Oran",
                city: "Oran",
                revenue: "500,000 DZD",
                rating: 4.88,
                image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
              },
            ].map((stay) => (
              <div key={stay.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-neutral-50 transition">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                    <Image src={stay.image} alt={stay.title} fill className="object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-primary truncate max-w-[200px]">
                      {stay.title}
                    </h4>
                    <span className="text-[11px] text-neutral-400">
                      {stay.city} • ★ {stay.rating}
                    </span>
                  </div>
                </div>
                <div className="font-mono font-bold text-xs text-primary text-end">
                  {stay.revenue}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
