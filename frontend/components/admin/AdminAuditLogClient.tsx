"use client";

import React, { useState, useMemo } from "react";
import { AuditLogEntry } from "@/lib/data/admin";
import {
  HiOutlineClipboardList,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineClock,
  HiOutlineShieldCheck,
} from "react-icons/hi";

interface AdminAuditLogClientProps {
  initialLogs: AuditLogEntry[];
}

export default function AdminAuditLogClient({ initialLogs }: AdminAuditLogClientProps) {
  const [logs] = useState<AuditLogEntry[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (typeFilter !== "all" && log.targetType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !log.action.toLowerCase().includes(q) &&
          !log.details.toLowerCase().includes(q) &&
          !log.adminName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [logs, typeFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Platform Security & Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Immutable log recording administrative interventions, listing suspensions, fee adjustments, and refunds.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-tertiary/70 shadow-2xs">
          <HiOutlineShieldCheck size={18} className="text-secondary" />
          <span className="text-xs font-bold text-neutral-500 uppercase">Records:</span>
          <span className="font-mono font-bold text-primary">{logs.length} events</span>
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
            placeholder="Search action, admin name, or event detail..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="admin-audit-target-type" className="sr-only">Target Type</label>
          <select
            id="admin-audit-target-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="all">All Event Types</option>
            <option value="listing">Listings</option>
            <option value="booking">Bookings & Refunds</option>
            <option value="user">User Roles</option>
            <option value="organization">Agencies & Orgs</option>
            <option value="coupon">Promotions</option>
            <option value="setting">Platform Config</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">Timestamp</th>
                <th className="py-3 px-4 text-start">Operator</th>
                <th className="py-3 px-4 text-start">Action</th>
                <th className="py-3 px-4 text-start">Scope / Target</th>
                <th className="py-3 px-4 text-start">Event Description</th>
                <th className="py-3 px-4 text-end">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40 font-medium">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3.5 px-4 font-mono text-neutral-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("fr-DZ", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-primary whitespace-nowrap">
                    {log.adminName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 capitalize font-semibold text-neutral-600 whitespace-nowrap">
                    {log.targetType} ({log.targetId})
                  </td>
                  <td className="py-3.5 px-4 text-neutral-700 max-w-md">
                    {log.details}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-400 text-end whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
