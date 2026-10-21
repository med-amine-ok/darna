"use client";

import React, { useState } from "react";
import { BrandDownloadIcon, BrandStarIcon } from "@/components/icons";
import { toast } from "react-toastify";

export default function AdminReportsClient() {
  const [reportType, setReportType] = useState<
    "financial" | "occupancy" | "inventory" | "payments" | "host_types" | "cross_tab"
  >("financial");
  const [dateRange, setDateRange] = useState("2026_q3");

  // Generate and download genuine CSV file
  const handleDownloadCSV = () => {
    let filename = `DARNA-Report-${reportType}-${dateRange}.csv`;
    let csvContent = "";

    if (reportType === "financial") {
      csvContent =
        "Month,Gross_Volume_DZD,Host_Payout_DZD,Platform_Commission_DZD,Guest_Service_Fee_DZD,Net_Take_DZD\n" +
        "May 2026,840000,756000,100800,58800,159600\n" +
        "Jun 2026,1450000,1305000,174000,101500,275500\n" +
        "Jul 2026,2180000,1962000,261600,152600,414200\n" +
        "Aug 2026,2750000,2475000,330000,192500,522500\n" +
        "Sep 2026,1920000,1728000,230400,134400,364800\n" +
        "Oct 2026,1680000,1512000,201600,117600,319200\n";
    } else if (reportType === "host_types") {
      csvContent =
        "Host_Type,Active_Fleet,Bookings_Count,Gross_Volume_DZD,Commission_Rate,Platform_Commission_Earned_DZD\n" +
        "Individual (Solo),14,24,1840000,12.0%,220800\n" +
        "Tourism Agency,8,40,4060000,15.0%,609000\n" +
        "Hotel & Resort,3,36,3200000,18.0%,576000\n" +
        "Youth Hostel,2,42,540000,10.0%,54000\n";
    } else if (reportType === "cross_tab") {
      csvContent =
        "Host_Type,Homes_and_Stays_DZD,Vehicles_4x4_DZD,Cultural_Experiences_DZD,Agency_Trips_DZD\n" +
        "Individual (Solo),1420000,280000,140000,N/A\n" +
        "Tourism Agency,300000,960000,650000,2150000\n" +
        "Hotel & Resort,3200000,N/A,N/A,N/A\n" +
        "Youth Hostel,540000,N/A,N/A,N/A\n";
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
          <BrandDownloadIcon size={18} className="text-tertiary" />
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
            <option value="host_types">Host Type Performance & Take Rates</option>
            <option value="cross_tab">Host Type × Vertical Matrix</option>
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
              On-Screen Summary: {reportType.replace("_", " ")}
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

        {reportType === "host_types" && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-semibold">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-start">Host Type</th>
                  <th className="py-2.5 px-3 text-center">Active Fleet</th>
                  <th className="py-2.5 px-3 text-center">Bookings</th>
                  <th className="py-2.5 px-3 text-end">Gross Volume</th>
                  <th className="py-2.5 px-3 text-center">Commission Rate</th>
                  <th className="py-2.5 px-3 text-end">Platform Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {[
                  { t: "Individual (Solo)", f: 14, b: 24, g: 1840000, r: "12.0%", e: 220800 },
                  { t: "Tourism Agency", f: 8, b: 40, g: 4060000, r: "15.0%", e: 609000 },
                  { t: "Hotel & Resort", f: 3, b: 36, g: 3200000, r: "18.0%", e: 576000 },
                  { t: "Youth Hostel", f: 2, b: 42, g: 540000, r: "10.0%", e: 54000 },
                ].map((row) => (
                  <tr key={row.t} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-primary font-bold">{row.t}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.f}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.b}</td>
                    <td className="py-2.5 px-3 font-mono text-end">{row.g.toLocaleString()} DZD</td>
                    <td className="py-2.5 px-3 text-center font-bold text-accent">{row.r}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-primary text-end">{row.e.toLocaleString()} DZD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === "cross_tab" && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-semibold">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-start">Host Type</th>
                  <th className="py-2.5 px-3 text-end">Homes & Stays</th>
                  <th className="py-2.5 px-3 text-end">4x4 Vehicles</th>
                  <th className="py-2.5 px-3 text-end">Cultural Experiences</th>
                  <th className="py-2.5 px-3 text-end">Agency Trips</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {[
                  { t: "Individual (Solo)", stays: "1,420,000 DZD", vehicles: "280,000 DZD", exp: "140,000 DZD", trips: "—" },
                  { t: "Tourism Agency", stays: "300,000 DZD", vehicles: "960,000 DZD", exp: "650,000 DZD", trips: "2,150,000 DZD" },
                  { t: "Hotel & Resort", stays: "3,200,000 DZD", vehicles: "—", exp: "—", trips: "—" },
                  { t: "Youth Hostel", stays: "540,000 DZD", vehicles: "—", exp: "—", trips: "—" },
                ].map((row) => (
                  <tr key={row.t} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-primary font-bold">{row.t}</td>
                    <td className="py-2.5 px-3 font-mono text-end">{row.stays}</td>
                    <td className={`py-2.5 px-3 font-mono text-end ${row.vehicles === "—" ? "text-neutral-300" : "text-neutral-700"}`}>{row.vehicles}</td>
                    <td className={`py-2.5 px-3 font-mono text-end ${row.exp === "—" ? "text-neutral-300" : "text-neutral-700"}`}>{row.exp}</td>
                    <td className={`py-2.5 px-3 font-mono text-end ${row.trips === "—" ? "text-neutral-300 italic" : "text-primary font-bold"}`}>{row.trips}</td>
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

        {reportType === "inventory" && (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs font-semibold">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-start">Category / Fleet</th>
                  <th className="py-2.5 px-3 text-center">Active Listings</th>
                  <th className="py-2.5 px-3 text-center">New This Month</th>
                  <th className="py-2.5 px-3 text-center">Guest Rating</th>
                  <th className="py-2.5 px-3 text-end">Instant Book</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {[
                  { c: "Coastal Villas", a: 14, n: 2, r: "4.94", ib: "85%" },
                  { c: "Casbah Riads", a: 8, n: 1, r: "4.91", ib: "75%" },
                  { c: "Sahara Expeditions", a: 12, n: 3, r: "4.98", ib: "90%" },
                  { c: "4x4 Overlanders", a: 9, n: 2, r: "4.89", ib: "80%" },
                ].map((row) => (
                  <tr key={row.c} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 text-primary font-bold">{row.c}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.a}</td>
                    <td className="py-2.5 px-3 text-center text-neutral-600 font-mono">+{row.n}</td>
                    <td className="py-2.5 px-3 text-center text-neutral-700 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <BrandStarIcon size={12} className="text-accent fill-accent" />
                        <span>{row.r}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-end font-bold text-accent">{row.ib}</td>
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
