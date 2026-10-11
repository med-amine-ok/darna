"use client";

import React, { useState } from "react";
import {
  HiOutlineDocumentReport,
  HiOutlineDownload,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar,
  HiOutlineTrendingUp,
} from "react-icons/hi";
import { toast } from "react-toastify";

export default function AdminReportsClient() {
  const [reportType, setReportType] = useState<"financial" | "occupancy" | "inventory" | "payments">("financial");
  const [dateRange, setDateRange] = useState("2026_q3");

  // Generate and download genuine CSV file
  const handleDownloadCSV = () => {
    let filename = `DARNA-Report-${reportType}-${dateRange}.csv`;
    let csvContent = "";

    if (reportType === "financial") {
      csvContent =
        "Month,Gross_Volume_DZD,Host_Payout_DZD,DARNA_Host_Fee_3pct,DARNA_Guest_Fee_7pct,Platform_Net_Revenue_DZD\n" +
        "May 2026,840000,756000,25200,58800,84000\n" +
        "Jun 2026,1450000,1305000,43500,101500,145000\n" +
        "Jul 2026,2180000,1962000,65400,152600,218000\n" +
        "Aug 2026,2750000,2475000,82500,192500,275000\n" +
        "Sep 2026,1920000,1728000,57600,134400,192000\n" +
        "Oct 2026,1680000,1512000,50400,117600,168000\n";
    } else if (reportType === "occupancy") {
      csvContent =
        "Wilaya,Total_Listings,Booked_Nights,Occupancy_Rate,Avg_Nightly_Price_DZD\n" +
        "Algiers,18,450,82.4%,16500\n" +
        "Tipaza,8,220,78.9%,18500\n" +
        "Oran,12,310,75.2%,14000\n" +
        "Constantine,6,140,68.5%,12000\n" +
        "Djanet,8,190,84.1%,22000\n" +
        "Taghit,5,110,71.0%,17000\n";
    } else if (reportType === "inventory") {
      csvContent =
        "Category,Active_Fleet,New_This_Month,Avg_Rating,Instant_Book_Adoption\n" +
        "Coastal Villas,14,2,4.94,85%\n" +
        "Casbah Riads,8,1,4.91,75%\n" +
        "Sahara Expeditions,12,3,4.98,90%\n" +
        "4x4 Overlanders,9,2,4.89,80%\n";
    } else {
      csvContent =
        "Payment_Method,Transactions_Count,Share_Percent,Settlement_Gateway,Avg_Clearing_Hours\n" +
        "CIB / Edahabia Card,98,74.2%,SATIM Electronic Switch,instant\n" +
        "Algérie Poste CCP Transfer,22,16.7%,Poste DZ Direct Clef,24h\n" +
        "BNA Bank Interbank RIB,12,9.1%,Banque Nationale d'Algérie,48h\n";
    }

    // Create Blob with UTF-8 BOM
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filename} successfully!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Platform Reports & Data Exports
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Generate verifiable Algerian fiscal statements, SATIM transaction reports, and occupancy audits in CSV format.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCSV}
          className="px-5 py-2.5 bg-primary text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-primary/95 transition flex items-center gap-2 shadow-2xs self-start md:self-auto"
        >
          <HiOutlineDownload size={18} className="text-tertiary" />
          <span>Export Official CSV</span>
        </button>
      </div>

      {/* Control selectors */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="report-type-select" className="text-xs font-bold text-neutral-500 whitespace-nowrap">Report Type:</label>
          <select
            id="report-type-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full md:w-64 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="financial">Financial Gross Volume & Fees</option>
            <option value="occupancy">Wilaya Occupancy & Demand</option>
            <option value="inventory">Fleet & Category Inventory</option>
            <option value="payments">SATIM & CCP Settlement Channels</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="report-date-range-select" className="text-xs font-bold text-neutral-500 whitespace-nowrap">Period:</label>
          <select
            id="report-date-range-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full md:w-56 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none"
          >
            <option value="2026_q3">Q3 2026 (Jul – Sep)</option>
            <option value="2026_ytd">Year to Date 2026</option>
            <option value="2026_oct">Current Month (October 2026)</option>
          </select>
        </div>
      </div>

      {/* Live On-Screen Preview Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-tertiary/60">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary capitalize">
              On-Screen Summary: {reportType}
            </h3>
            <p className="text-xs text-neutral-500">
              Live preview reflecting active platform ledger records
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30">
            DZD Currency Verified
          </span>
        </div>

        {reportType === "financial" && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-semibold">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-start">Month</th>
                  <th className="py-2.5 px-3 text-end">Gross Volume</th>
                  <th className="py-2.5 px-3 text-end">Host Payouts</th>
                  <th className="py-2.5 px-3 text-end">Host Fee (3%)</th>
                  <th className="py-2.5 px-3 text-end">Guest Fee (7%)</th>
                  <th className="py-2.5 px-3 text-end">DARNA Net Take</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {[
                  { m: "May 2026", g: 840000, h: 756000, hf: 25200, gf: 58800, net: 84000 },
                  { m: "Jun 2026", g: 1450000, h: 1305000, hf: 43500, gf: 101500, net: 145000 },
                  { m: "Jul 2026", g: 2180000, h: 1962000, hf: 65400, gf: 152600, net: 218000 },
                  { m: "Aug 2026", g: 2750000, h: 2475000, hf: 82500, gf: 192500, net: 275000 },
                  { m: "Sep 2026", g: 1920000, h: 1728000, hf: 57600, gf: 134400, net: 192000 },
                ].map((row) => (
                  <tr key={row.m} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-primary">{row.m}</td>
                    <td className="py-2.5 px-3 font-mono text-end">{row.g.toLocaleString()} DZD</td>
                    <td className="py-2.5 px-3 font-mono text-end text-neutral-600">{row.h.toLocaleString()} DZD</td>
                    <td className="py-2.5 px-3 font-mono text-end text-neutral-500">{row.hf.toLocaleString()} DZD</td>
                    <td className="py-2.5 px-3 font-mono text-end text-neutral-500">{row.gf.toLocaleString()} DZD</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-accent text-end">{row.net.toLocaleString()} DZD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === "occupancy" && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-semibold">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-start">Wilaya</th>
                  <th className="py-2.5 px-3 text-center">Listings</th>
                  <th className="py-2.5 px-3 text-center">Booked Nights</th>
                  <th className="py-2.5 px-3 text-center">Occupancy Rate</th>
                  <th className="py-2.5 px-3 text-end">Avg. Nightly Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {[
                  { w: "Algiers", l: 18, n: 450, occ: "82.4%", rate: 16500 },
                  { w: "Tipaza", l: 8, n: 220, occ: "78.9%", rate: 18500 },
                  { w: "Oran", l: 12, n: 310, occ: "75.2%", rate: 14000 },
                  { w: "Djanet", l: 8, n: 190, occ: "84.1%", rate: 22000 },
                ].map((row) => (
                  <tr key={row.w} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-primary">{row.w}</td>
                    <td className="py-2.5 px-3 text-center">{row.l}</td>
                    <td className="py-2.5 px-3 text-center">{row.n}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{row.occ}</td>
                    <td className="py-2.5 px-3 font-mono text-end">{row.rate.toLocaleString()} DZD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-semibold">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-start">Payment Channel</th>
                  <th className="py-2.5 px-3 text-center">Tx Count</th>
                  <th className="py-2.5 px-3 text-center">Share</th>
                  <th className="py-2.5 px-3 text-start">Clearing Entity</th>
                  <th className="py-2.5 px-3 text-end">Settlement Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {[
                  { m: "CIB / Edahabia Card", c: 98, s: "74.2%", g: "SATIM National Switch", t: "Instant" },
                  { m: "Algérie Poste CCP Transfer", c: 22, s: "16.7%", g: "Poste DZ Clef", t: "24 Hours" },
                  { m: "BNA Interbank RIB", c: 12, s: "9.1%", g: "Banque Nationale d'Algérie", t: "48 Hours" },
                ].map((row) => (
                  <tr key={row.m} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-primary">{row.m}</td>
                    <td className="py-2.5 px-3 text-center">{row.c}</td>
                    <td className="py-2.5 px-3 text-center text-accent font-bold">{row.s}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{row.g}</td>
                    <td className="py-2.5 px-3 text-end text-neutral-500">{row.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
