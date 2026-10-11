"use client";

import React, { useState } from "react";
import { Coupon, createAdminCoupon, toggleCouponStatus, deleteCoupon } from "@/lib/data/admin";
import {
  HiOutlineTicket,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineBan,
} from "react-icons/hi";
import { toast } from "react-toastify";

interface AdminPromotionsClientProps {
  initialCoupons: Coupon[];
}

export default function AdminPromotionsClient({ initialCoupons }: AdminPromotionsClientProps) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_dzd">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minSpendDzd, setMinSpendDzd] = useState<number>(20000);
  const [maxUsage, setMaxUsage] = useState<number>(100);
  const [scope, setScope] = useState<Coupon["scope"]>("all");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-12-31");

  const generateRandomCode = () => {
    const prefixes = ["DARNA", "SAHARA", "CASBAH", "ATLAS"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    setCode(`${prefix}-${num}`);
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleCouponStatus(id);
      if (updated) {
        setCoupons((prev) => prev.map((c) => (c.id === id ? updated : c)));
        toast.info(`Coupon status updated to ${updated.status}.`);
      }
    } catch {
      toast.error("Failed to update coupon.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion code?")) return;
    try {
      const success = await deleteCoupon(id);
      if (success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        toast.success("Coupon code deleted.");
      }
    } catch {
      toast.error("Failed to delete coupon.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter or generate a code.");
      return;
    }

    try {
      const newCoupon = await createAdminCoupon({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        minSpendDzd,
        maxUsage,
        startDate,
        endDate,
        status: "active",
        scope,
      });

      setCoupons((prev) => [newCoupon, ...prev]);
      toast.success(`Promo code ${newCoupon.code} created!`);
      setIsModalOpen(false);
      setCode("");
    } catch {
      toast.error("Failed to create coupon.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Coupons & Promotional Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Create discount codes, set minimum spend thresholds in DZD, and track coupon redemptions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            generateRandomCode();
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-2xs self-start md:self-auto"
        >
          <HiOutlinePlus size={16} />
          <span>New Promo Code</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">Promo Code</th>
                <th className="py-3 px-4 text-start">Discount Value</th>
                <th className="py-3 px-4 text-start">Scope</th>
                <th className="py-3 px-4 text-start">Min. Spend</th>
                <th className="py-3 px-4 text-center">Usage / Limit</th>
                <th className="py-3 px-4 text-start">Validity Dates</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {coupons.map((cpn) => (
                <tr key={cpn.id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary text-sm">
                    {cpn.code}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-accent">
                    {cpn.discountType === "percentage"
                      ? `${cpn.discountValue}% OFF`
                      : `${cpn.discountValue.toLocaleString()} DZD OFF`}
                  </td>
                  <td className="py-3.5 px-4 capitalize font-medium text-neutral-600">
                    {cpn.scope}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-700">
                    {cpn.minSpendDzd.toLocaleString()} DZD
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold">
                    {cpn.usedCount} / {cpn.maxUsage}
                  </td>
                  <td className="py-3.5 px-4 text-neutral-500">
                    {cpn.startDate} → {cpn.endDate}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cpn.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : cpn.status === "expired"
                          ? "bg-neutral-100 text-neutral-700"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {cpn.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggle(cpn.id)}
                        className="px-2.5 py-1 rounded-lg border border-tertiary/80 text-[11px] font-bold hover:bg-neutral-50"
                      >
                        {cpn.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cpn.id)}
                        className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg"
                        title="Delete code"
                      >
                        <HiOutlineTrash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-lg font-black text-primary mb-4 pb-2 border-b border-tertiary/60">
              Create Promotional Code
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-600">Promo Code</label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-xs text-secondary hover:text-primary font-bold flex items-center gap-1"
                  >
                    <HiOutlineRefresh size={12} /> Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none tracking-wider uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_dzd">Fixed DZD (د.ج)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">
                    Value {discountType === "percentage" ? "(%)" : "(DZD)"}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">Min. Spend (DZD)</label>
                  <input
                    type="number"
                    value={minSpendDzd}
                    onChange={(e) => setMinSpendDzd(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Applicable Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none"
                >
                  <option value="all">Entire Marketplace</option>
                  <option value="homes">Homes & Stays Only</option>
                  <option value="experiences">Sahara & Culture Only</option>
                  <option value="vehicles">4x4 Vehicles Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
