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
  Legend,
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
  HiOutlineViewGrid,
  HiOutlineChartBar,
  HiOutlineTag,
  HiOutlineCreditCard,
  HiOutlineTable,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";
import { DetailedAnalytics } from "@/lib/data/admin";
import PriceDisplay from "@/components/common/PriceDisplay";

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
  detailed?: DetailedAnalytics;
}

export default function AdminDashboardClient({ kpis, charts, detailed }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "by_host_type" | "by_vertical" | "cross_tab" | "financial">("overview");
  const [period, setPeriod] = useState("30d");
  const [selectedHostType, setSelectedHostType] = useState<"all" | "individual" | "agency" | "hotel" | "hostel">("all");
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string; revenue: number; bookings: number } | null>(null);

  // Multiplier for responsive date selector demo
  const multiplier = period === "7d" ? 0.3 : period === "90d" ? 2.4 : period === "1y" ? 8.2 : 1;

  const currentRevenue = Math.round(kpis.platformNetRevenueDzd * multiplier);
  const currentVolume = Math.round(kpis.totalGrossVolumeDzd * multiplier);
  const currentBookings = Math.round(kpis.totalBookings * multiplier);

  // Fallback if detailed is loading/undefined
  const hostMetrics = detailed?.hostTypeMetrics;
  const vertMetrics = detailed?.verticalMetrics;
  const crossTab = detailed?.crossTabMatrix || [];
  const compCharts = detailed?.comparativeCharts;
  const finMetrics = detailed?.financialMetrics;

  const formatDzd = (num: number) => num.toLocaleString("fr-DZ") + " DZD";

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Top Header & Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Platform Command Center & Business Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Real-time Algerian marketplace KPIs, cross-cut by host category, vertical offerings, and fiscal take-rates.
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

      {/* Primary Dimensional Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-tertiary/60 no-scrollbar">
        {[
          { id: "overview", label: "Executive Overview", icon: HiOutlineChartBar },
          { id: "by_host_type", label: "By Host Type (4-Way)", icon: HiOutlineUsers },
          { id: "by_vertical", label: "By Vertical (Trips, Stays, 4x4)", icon: HiOutlineTag },
          { id: "cross_tab", label: "Cross-Tab Matrix (Heatmap)", icon: HiOutlineTable },
          { id: "financial", label: "Fiscal & Commission Ledger", icon: HiOutlineCreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white hover:bg-neutral-100 text-neutral-600 border border-tertiary/70"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in">
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
                {currentRevenue.toLocaleString("fr-DZ")} DZD
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2">
                <HiOutlineTrendingUp className="text-secondary" />
                <span>+18.2% vs previous period</span>
              </div>
            </div>

            {/* Card 2: Gross GMV */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Gross Marketplace GMV
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/20 text-primary">
                  {kpis.trends.bookings}
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-primary">
                {currentVolume.toLocaleString("fr-DZ")} DZD
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2">
                <HiOutlineCash className="text-secondary" />
                <span>Avg Booking: {kpis.avgBookingValueDzd.toLocaleString("fr-DZ")} DZD</span>
              </div>
            </div>

            {/* Card 3: Total Bookings */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Confirmed Bookings
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-primary">
                {currentBookings} <span className="text-xs font-sans text-neutral-500 font-semibold">Stays & Trips</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2">
                <HiOutlineCalendar className="text-secondary" />
                <span>Occupancy Rate: {kpis.occupancyRatePercent}%</span>
              </div>
            </div>

            {/* Card 4: Platform Commission Earned */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs hover:shadow-md transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Host Commission Earned
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                  Take-Rate
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-800">
                {(finMetrics?.totalCommissionEarned || 1459800).toLocaleString("fr-DZ")} DZD
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2">
                <HiOutlineCreditCard className="text-emerald-700" />
                <span>Avg 15.1% across 4 host types</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Monthly Revenue Curve */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-primary">
                    Monthly Revenue & Seasonal Growth
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Gross booking volume across coastal, Sahara, and mountain seasons
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Revenue (DZD)
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                      formatter={(val: number) => [`${val.toLocaleString("fr-DZ")} DZD`, "Revenue"]}
                      contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "12px", color: "#fff", border: "none" }}
                      itemStyle={{ color: "#F8F6EE" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#C96F4F"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#revGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Col: Listings by Vertical */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary mb-1">
                  Listings by Vertical
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Fleet distribution across Homes, Sahara Expeditions, 4x4s & Guides
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
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {charts.listingsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "8px", color: "#fff" }}
                        itemStyle={{ color: "#F8F6EE" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-tertiary/60">
                {charts.listingsByType.map((item) => (
                  <div key={item.type} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                    <span className="truncate text-neutral-600">{item.type}:</span>
                    <span className="font-bold text-primary ms-auto">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wilayas Map Bar Chart */}
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs space-y-4">
            <h3 className="font-serif text-lg font-bold text-primary">
              Geographic Booking Velocity by Wilaya
            </h3>
            <p className="text-xs text-neutral-500">
              Demand concentration across tourist hubs and desert provinces in Algeria
            </p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.bookingsByWilaya} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
                  <XAxis dataKey="wilaya" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "10px", color: "#fff" }}
                    formatter={(val: number) => [`${val} Bookings`, "Volume"]}
                  />
                  <Bar dataKey="bookings" fill="#2E3A2F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BREAKDOWN BY HOST TYPE (4-WAY) */}
      {/* ========================================================================= */}
      {activeTab === "by_host_type" && hostMetrics && (
        <div className="space-y-8 animate-in fade-in">
          {/* Host Type Selector Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All 4 Host Types" },
              { id: "individual", label: "Individual Hosts" },
              { id: "agency", label: "Tourism Agencies" },
              { id: "hotel", label: "Hotels & Palaces" },
              { id: "hostel", label: "Youth Hostels" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedHostType(pill.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedHostType === pill.id
                    ? "bg-secondary text-white shadow-2xs"
                    : "bg-white text-neutral-600 border border-tertiary/70 hover:bg-neutral-50"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* 4 Cards: Each Host Type Deep Dive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Individual Host Card */}
            {(selectedHostType === "all" || selectedHostType === "individual") && (
              <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-primary">
                    Individual (Solo)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">{hostMetrics.individual.growthRate}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Revenue</span>
                  <div className="text-xl font-serif font-black text-primary font-mono">
                    {formatDzd(hostMetrics.individual.revenue)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                  <div>
                    <span className="text-neutral-400 block">Bookings:</span>
                    <span className="font-bold text-primary">{hostMetrics.individual.bookings} stays</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Fleet:</span>
                    <span className="font-bold text-primary">{hostMetrics.individual.activeProperties} homes</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Take-Rate:</span>
                    <span className="font-bold text-primary font-mono">{hostMetrics.individual.commissionRate}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Superhost:</span>
                    <span className="font-bold text-primary">{hostMetrics.individual.superhostRatio}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tourism Agency Card */}
            {(selectedHostType === "all" || selectedHostType === "agency") && (
              <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                    Tourism Agency
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">{hostMetrics.agency.growthRate}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Revenue</span>
                  <div className="text-xl font-serif font-black text-primary font-mono">
                    {formatDzd(hostMetrics.agency.revenue)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                  <div>
                    <span className="text-neutral-400 block">Bookings:</span>
                    <span className="font-bold text-primary">{hostMetrics.agency.bookings} tours</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Avg Group:</span>
                    <span className="font-bold text-primary">{hostMetrics.agency.avgGroupSize} guests</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Take-Rate:</span>
                    <span className="font-bold text-primary font-mono">{hostMetrics.agency.commissionRate}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Trips Booked:</span>
                    <span className="font-bold text-primary">{hostMetrics.agency.tripsBooked} packages</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hotel & Resort Card */}
            {(selectedHostType === "all" || selectedHostType === "hotel") && (
              <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    Hotel & Resort
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">{hostMetrics.hotel.growthRate}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Revenue</span>
                  <div className="text-xl font-serif font-black text-primary font-mono">
                    {formatDzd(hostMetrics.hotel.revenue)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                  <div>
                    <span className="text-neutral-400 block">Bookings:</span>
                    <span className="font-bold text-primary">{hostMetrics.hotel.bookings} rooms</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Occupancy:</span>
                    <span className="font-bold text-primary">{hostMetrics.hotel.roomOccupancyRate}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Take-Rate:</span>
                    <span className="font-bold text-primary font-mono">{hostMetrics.hotel.commissionRate}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Avg ADR:</span>
                    <span className="font-bold text-primary font-mono">{formatDzd(hostMetrics.hotel.avgNightlyRate)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Youth Hostel Card */}
            {(selectedHostType === "all" || selectedHostType === "hostel") && (
              <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                    Youth Hostel
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">{hostMetrics.hostel.growthRate}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Revenue</span>
                  <div className="text-xl font-serif font-black text-primary font-mono">
                    {formatDzd(hostMetrics.hostel.revenue)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                  <div>
                    <span className="text-neutral-400 block">Bookings:</span>
                    <span className="font-bold text-primary">{hostMetrics.hostel.bookings} beds</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Bed Occ:</span>
                    <span className="font-bold text-primary">{hostMetrics.hostel.bedOccupancyRate}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Take-Rate:</span>
                    <span className="font-bold text-primary font-mono">{hostMetrics.hostel.commissionRate}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Avg Bed:</span>
                    <span className="font-bold text-primary font-mono">{formatDzd(hostMetrics.hostel.avgBedRate)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grouped Bar Chart: Side-by-Side Comparison */}
          {compCharts && (
            <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-primary">
                    Side-by-Side Comparison Across All 4 Host Types
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Gross revenue and booking volumes by host category (Earthy Minimal palette series order)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compCharts.revenueByHostType} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        name === "revenue" ? `${val.toLocaleString("fr-DZ")} DZD` : val,
                        name === "revenue" ? "Gross Revenue" : "Bookings",
                      ]}
                      contentStyle={{ backgroundColor: "#2E3A2F", borderRadius: "12px", color: "#fff", border: "none" }}
                      itemStyle={{ color: "#F8F6EE" }}
                    />
                    <Bar dataKey="revenue" name="revenue" fill="#C96F4F" radius={[6, 6, 0, 0]}>
                      {compCharts.revenueByHostType.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BREAKDOWN BY VERTICAL */}
      {/* ========================================================================= */}
      {activeTab === "by_vertical" && vertMetrics && (
        <div className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Homes */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E3A2F]" />
                  <span>Homes & Stays</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700">{vertMetrics.home.growthRate}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Volume</span>
                <div className="text-xl font-serif font-black text-primary font-mono">{formatDzd(vertMetrics.home.revenue)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                <div>
                  <span className="text-neutral-400 block">Bookings:</span>
                  <span className="font-bold text-primary">{vertMetrics.home.bookings}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Fleet:</span>
                  <span className="font-bold text-primary">{vertMetrics.home.activeListings} listings</span>
                </div>
              </div>
            </div>

            {/* Trips */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C96F4F]" />
                  <span>Agency Trips</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700">{vertMetrics.trip.growthRate}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Volume</span>
                <div className="text-xl font-serif font-black text-primary font-mono">{formatDzd(vertMetrics.trip.revenue)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                <div>
                  <span className="text-neutral-400 block">Expeditions:</span>
                  <span className="font-bold text-primary">{vertMetrics.trip.bookings}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Curated:</span>
                  <span className="font-bold text-primary">{vertMetrics.trip.activeListings} trips</span>
                </div>
              </div>
            </div>

            {/* Vehicles */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6B7F5B]" />
                  <span>4x4 Overlanders</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700">{vertMetrics.vehicle.growthRate}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Volume</span>
                <div className="text-xl font-serif font-black text-primary font-mono">{formatDzd(vertMetrics.vehicle.revenue)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                <div>
                  <span className="text-neutral-400 block">Rentals:</span>
                  <span className="font-bold text-primary">{vertMetrics.vehicle.bookings}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Fleet:</span>
                  <span className="font-bold text-primary">{vertMetrics.vehicle.activeListings} 4x4s</span>
                </div>
              </div>
            </div>

            {/* Experiences */}
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9C9B2]" />
                  <span>Cultural Guides</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700">{vertMetrics.experience.growthRate}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-bold block uppercase tracking-wider">Gross Volume</span>
                <div className="text-xl font-serif font-black text-primary font-mono">{formatDzd(vertMetrics.experience.revenue)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-tertiary/50">
                <div>
                  <span className="text-neutral-400 block">Tours:</span>
                  <span className="font-bold text-primary">{vertMetrics.experience.bookings}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Guides:</span>
                  <span className="font-bold text-primary">{vertMetrics.experience.activeListings} guides</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CROSS-TAB MATRIX (HEATMAP) */}
      {/* ========================================================================= */}
      {activeTab === "cross_tab" && crossTab.length > 0 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-tertiary/60">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary">
                  Revenue by Host Type × Vertical (Dimensional Matrix)
                </h3>
                <p className="text-xs text-neutral-500">
                  Heatmap matrix illustrating the cross-product of host models against platform verticals.
                  Structural exclusions (e.g. Trips exclusively belonging to Tourism Agencies) are represented as &quot;—&quot;.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Host Type \ Vertical</th>
                    <th className="py-3 px-4 text-center">Homes & Stays</th>
                    <th className="py-3 px-4 text-center">4x4 Vehicles</th>
                    <th className="py-3 px-4 text-center">Cultural Experiences</th>
                    <th className="py-3 px-4 text-center">Agency Trips & Expeditions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {crossTab.map((row) => (
                    <tr key={row.hostType} className="hover:bg-neutral-50/50">
                      <td className="py-4 px-4 font-bold text-primary whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <HiOutlineOfficeBuilding className="text-secondary" size={16} />
                          <span>{row.hostTypeName}</span>
                        </div>
                      </td>

                      {/* Home */}
                      <td className="py-4 px-4 text-center">
                        {row.home ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCell({ row: row.hostTypeName, col: "Homes & Stays", revenue: row.home!.revenue, bookings: row.home!.bookings })}
                            className="w-full py-2 px-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition text-center cursor-pointer"
                          >
                            <span className="font-mono font-bold text-primary block">
                              {(row.home.revenue / 1000).toFixed(0)}k DZD
                            </span>
                            <span className="text-[10px] text-neutral-500">{row.home.bookings} bookings</span>
                          </button>
                        ) : (
                          <span className="text-neutral-300 font-mono text-base" title="Structurally restricted">—</span>
                        )}
                      </td>

                      {/* Vehicle */}
                      <td className="py-4 px-4 text-center">
                        {row.vehicle ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCell({ row: row.hostTypeName, col: "4x4 Overlanders", revenue: row.vehicle!.revenue, bookings: row.vehicle!.bookings })}
                            className="w-full py-2 px-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition text-center cursor-pointer"
                          >
                            <span className="font-mono font-bold text-primary block">
                              {(row.vehicle.revenue / 1000).toFixed(0)}k DZD
                            </span>
                            <span className="text-[10px] text-neutral-500">{row.vehicle.bookings} bookings</span>
                          </button>
                        ) : (
                          <span className="text-neutral-300 font-mono text-base" title="Structurally restricted">—</span>
                        )}
                      </td>

                      {/* Experience */}
                      <td className="py-4 px-4 text-center">
                        {row.experience ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCell({ row: row.hostTypeName, col: "Cultural Experiences", revenue: row.experience!.revenue, bookings: row.experience!.bookings })}
                            className="w-full py-2 px-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition text-center cursor-pointer"
                          >
                            <span className="font-mono font-bold text-primary block">
                              {(row.experience.revenue / 1000).toFixed(0)}k DZD
                            </span>
                            <span className="text-[10px] text-neutral-500">{row.experience.bookings} bookings</span>
                          </button>
                        ) : (
                          <span className="text-neutral-300 font-mono text-base" title="Structurally restricted">—</span>
                        )}
                      </td>

                      {/* Trip */}
                      <td className="py-4 px-4 text-center">
                        {row.trip ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCell({ row: row.hostTypeName, col: "Agency Trips", revenue: row.trip!.revenue, bookings: row.trip!.bookings })}
                            className="w-full py-2 px-3 rounded-xl bg-accent/15 hover:bg-accent/25 transition text-center border border-accent/20 cursor-pointer"
                          >
                            <span className="font-mono font-bold text-accent block">
                              {(row.trip.revenue / 1000).toFixed(0)}k DZD
                            </span>
                            <span className="text-[10px] text-accent/80 font-semibold">{row.trip.bookings} expeditions</span>
                          </button>
                        ) : (
                          <div className="py-2 text-center" title="Trips belong strictly to Tourism Agencies">
                            <span className="text-neutral-300 font-mono text-base block">—</span>
                            <span className="text-[9px] text-neutral-400 font-medium">Agency Only</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Guidance Note */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-tertiary/40 flex items-start gap-2.5 text-xs text-neutral-600">
              <HiOutlineInformationCircle size={16} className="text-secondary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Structural Sparseness Rule:</strong> The &quot;—&quot; cells indicate intentionally disallowed combinations per Algerian tourism regulatory compliance (e.g. Commercial Hotels cannot list multi-day desert overland expeditions; only CNRC/Ministry licensed Tourism Agencies can publish packaged Trips).
              </p>
            </div>
          </div>

          {/* Interactive Cell Inspector Modal */}
          {selectedCell && (
            <div className="p-4 bg-white rounded-3xl border border-primary/20 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold">
                  <HiOutlineTable size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-primary">
                    {selectedCell.row} × {selectedCell.col}
                  </h4>
                  <p className="text-xs text-neutral-500 font-mono">
                    Gross Volume: {formatDzd(selectedCell.revenue)} • {selectedCell.bookings} confirmed reservations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FISCAL & COMMISSION SYSTEM */}
      {/* ========================================================================= */}
      {activeTab === "financial" && finMetrics && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top 3 Fiscal Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Total Platform Commission
              </span>
              <div className="text-2xl font-serif font-black text-emerald-800 font-mono">
                {formatDzd(finMetrics.totalCommissionEarned)}
              </div>
              <span className="text-[11px] text-neutral-500 block">
                Net earnings automatically deducted from host deposit balances
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Prepaid Deposits Held
              </span>
              <div className="text-2xl font-serif font-black text-primary font-mono">
                {formatDzd(finMetrics.totalDepositsHeld)}
              </div>
              <span className="text-[11px] text-neutral-500 block">
                Total host solvency across all active bank and CCP ledgers
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-tertiary/70 p-5 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Average Take-Rate
              </span>
              <div className="text-2xl font-serif font-black text-primary font-mono">
                {finMetrics.avgPlatformTakeRate}%
              </div>
              <span className="text-[11px] text-neutral-500 block">
                Weighted average across 12% Indiv, 15% Agency, 18% Hotel, 10% Hostel
              </span>
            </div>
          </div>

          {/* Payment Method Channels Breakdown */}
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/60">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary">
                  Offline Payment Collection Channels
                </h3>
                <p className="text-xs text-neutral-500">
                  Volume breakdown of host offline deposit recharge channels in Algeria
                </p>
              </div>

              <Link
                href="/admin/wallets"
                className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-2xs"
              >
                <HiOutlineCreditCard size={15} />
                <span>Open Host Wallets</span>
              </Link>
            </div>

            <div className="space-y-3">
              {finMetrics.paymentChannels.map((ch) => (
                <div key={ch.channel} className="p-3.5 rounded-2xl bg-neutral-50 border border-tertiary/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-primary block">{ch.channel}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">Volume: {formatDzd(ch.volume)}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary/15 text-primary">
                    {ch.share} of total deposits
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
