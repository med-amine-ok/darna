"use client";

import React, { useState } from "react";
import { tokens } from "@/lib/tokens";

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

const monthlyData: MonthlyData[] = [
  { month: "Jan", revenue: 8400, bookings: 32 },
  { month: "Feb", revenue: 10200, bookings: 41 },
  { month: "Mar", revenue: 14500, bookings: 58 },
  { month: "Apr", revenue: 16800, bookings: 64 },
  { month: "May", revenue: 21300, bookings: 82 },
  { month: "Jun", revenue: 28900, bookings: 108 },
  { month: "Jul", revenue: 34200, bookings: 135 },
  { month: "Aug", revenue: 36800, bookings: 142 },
  { month: "Sep", revenue: 31500, bookings: 119 },
];

const categoryDistribution = [
  { name: "Beachfront & Coastal", count: 42, color: tokens.colors.accent.DEFAULT },
  { name: "Countryside & Cabins", count: 28, color: tokens.colors.secondary.DEFAULT },
  { name: "Modern City Living", count: 22, color: tokens.colors.primary.DEFAULT },
  { name: "Unique & Boutique", count: 14, color: tokens.colors.accent[400] },
];

export default function AdminCharts() {
  const [activeTab, setActiveTab] = useState<"all" | "revenue" | "bookings">("all");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Normalization for chart
  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue));
  const maxBookings = Math.max(...monthlyData.map((d) => d.bookings));

  const totalCategoryListings = categoryDistribution.reduce((acc, c) => acc + c.count, 0);

  // SVG Chart Dimensions
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate points
  const points = monthlyData.map((d, i) => {
    const x = padding.left + (i / (monthlyData.length - 1)) * graphWidth;
    const revY = padding.top + graphHeight - (d.revenue / maxRevenue) * graphHeight;
    const bookY = padding.top + graphHeight - (d.bookings / maxBookings) * graphHeight;
    return { x, revY, bookY, ...d };
  });

  // Construct SVG path strings
  const revenueLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.revY}`).join(" ");
  const revenueArea = `${revenueLine} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;

  const bookingsLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.bookY}`).join(" ");

  // Donut geometry
  let cumulativeAngle = 0;
  const donutSegments = categoryDistribution.map((item) => {
    const angle = (item.count / totalCategoryListings) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...item,
      startAngle,
      angle,
      percentage: Math.round((item.count / totalCategoryListings) * 100),
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Revenue & Bookings Trend (2 cols) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-tertiary p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Performance Trends</h2>
            <p className="text-xs text-neutral-500">Monthly revenue and booking metrics</p>
          </div>

          {/* Series Legend & Filter Toggles */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "revenue" ? "all" : "revenue")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === "all" || activeTab === "revenue"
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>Revenue ($)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "bookings" ? "all" : "bookings")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === "all" || activeTab === "bookings"
                  ? "bg-secondary/15 text-secondary-700 border border-secondary/30"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>Bookings</span>
            </button>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[500px] overflow-visible"
            aria-label="Revenue and Bookings trend chart"
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tokens.colors.accent.DEFAULT} stopOpacity="0.28" />
                <stop offset="100%" stopColor={tokens.colors.accent.DEFAULT} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines (Tertiary Tan) */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + graphHeight * pct;
              return (
                <line
                  key={i}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={tokens.colors.tertiary.DEFAULT}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.45"
                />
              );
            })}

            {/* Area under Revenue */}
            {(activeTab === "all" || activeTab === "revenue") && (
              <path d={revenueArea} fill="url(#revenueGrad)" />
            )}

            {/* Revenue Line (Series 1: Terracotta Accent) */}
            {(activeTab === "all" || activeTab === "revenue") && (
              <path
                d={revenueLine}
                fill="none"
                stroke={tokens.colors.accent.DEFAULT}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Bookings Line (Series 2: Sage Green Secondary) */}
            {(activeTab === "all" || activeTab === "bookings") && (
              <path
                d={bookingsLine}
                fill="none"
                stroke={tokens.colors.secondary.DEFAULT}
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Points */}
            {points.map((p, i) => (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover target */}
                <rect
                  x={p.x - 18}
                  y={padding.top}
                  width="36"
                  height={graphHeight}
                  fill="transparent"
                />

                {/* Revenue point */}
                {(activeTab === "all" || activeTab === "revenue") && (
                  <circle
                    cx={p.x}
                    cy={p.revY}
                    r={hoveredIndex === i ? 5.5 : 3.5}
                    fill="#FFFFFF"
                    stroke={tokens.colors.accent.DEFAULT}
                    strokeWidth="2.5"
                    className="transition-all duration-150"
                  />
                )}

                {/* Bookings point */}
                {(activeTab === "all" || activeTab === "bookings") && (
                  <circle
                    cx={p.x}
                    cy={p.bookY}
                    r={hoveredIndex === i ? 5 : 3}
                    fill={tokens.colors.secondary.DEFAULT}
                    className="transition-all duration-150"
                  />
                )}

                {/* Month Label */}
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#737373"
                  fontSize="11"
                  fontWeight={hoveredIndex === i ? "bold" : "normal"}
                >
                  {p.month}
                </text>
              </g>
            ))}
          </svg>

          {/* Active tooltip indicator */}
          {hoveredIndex !== null && (
            <div
              className="absolute top-2 start-1/2 -translate-x-1/2 bg-primary text-white text-xs py-1.5 px-3 rounded-xl shadow-lg border border-primary-700 pointer-events-none flex items-center gap-3 animate-in fade-in zoom-in-95 duration-100"
            >
              <span className="font-bold">{monthlyData[hoveredIndex].month}</span>
              <span className="text-accent font-semibold">
                ${monthlyData[hoveredIndex].revenue.toLocaleString()}
              </span>
              <span className="text-secondary-200">
                {monthlyData[hoveredIndex].bookings} bookings
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Listings By Type Donut (1 col) */}
      <div className="bg-white rounded-2xl border border-tertiary p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">Listings Distribution</h2>
          <p className="text-xs text-neutral-500">Inventory by primary category</p>
        </div>

        {/* Donut graphic */}
        <div className="py-4 flex items-center justify-center relative">
          <svg width="170" height="170" viewBox="0 0 100 100" className="transform -rotate-90">
            {donutSegments.map((seg, i) => {
              const strokeDasharray = `${seg.angle} ${360 - seg.angle}`;
              const strokeDashoffset = -seg.startAngle;
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  pathLength="360"
                  className="transition-all duration-300 hover:opacity-85"
                />
              );
            })}
          </svg>

          {/* Donut Center Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-primary leading-none">
              {totalCategoryListings}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mt-1">
              Active Stays
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          {categoryDistribution.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-neutral-700">{item.name}</span>
              </div>
              <span className="font-bold text-primary">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
