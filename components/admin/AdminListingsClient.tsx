"use client";

import React, { useState, useMemo, useTransition } from "react";
import { safeListing } from "@/types";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { MdSearch, MdDeleteOutline, MdOutlineVisibility } from "react-icons/md";
import { toast } from "react-toastify";
import axios from "axios";

interface Props {
  initialListings: safeListing[];
}

export default function AdminListingsClient({ initialListings }: Props) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [listings, setListings] = useState<safeListing[]>(initialListings);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(initialListings.map((l) => l.category));
    return Array.from(set);
  }, [initialListings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      const matchSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.locationValue.toLowerCase().includes(search.toLowerCase()) ||
        l.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === "all" || l.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [listings, search, selectedCategory]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(t("confirmDeleteListing"))) return;

    setDeletingId(id);
    try {
      await axios.delete(`/api/listings/${id}`);
      setListings((prev) => prev.filter((item) => item.id !== id));
      toast.success(t("listingDeleted"));
      router.refresh();
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <MdSearch
            size={20}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-neutral-900 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 outline-none focus:border-neutral-900 transition cursor-pointer"
          >
            <option value="all">{t("categoryFilter")}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">
            {t("totalCount", { count: filteredListings.length })}
          </span>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-2xl border border-tertiary shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-tertiary/20 text-xs text-primary uppercase border-b border-tertiary">
              <tr>
                <th className="py-3.5 px-4 text-start font-semibold">{t("listing")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("category")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{tCommon("price")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("roomsGuests")}</th>
                <th className="py-3.5 px-4 text-end font-semibold">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                filteredListings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="hover:bg-neutral-50/70 transition group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                          <Image
                            src={listing.imageSrc}
                            alt={listing.title}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-semibold text-neutral-900 truncate">
                            {listing.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            ID: {listing.id.slice(0, 8)}... · {listing.locationValue}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-700">
                        {listing.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      ${listing.price}
                      <span className="text-xs font-normal text-neutral-400 ms-1">
                        / {tCommon("night")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 text-xs">
                      {listing.roomCount} {tCommon("rooms")} · {listing.guestCount} {tCommon("guests")}
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/listings/${listing.id}`}
                          target="_blank"
                          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                          title={t("viewOnSite")}
                        >
                          <MdOutlineVisibility size={18} />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(listing.id, e)}
                          disabled={deletingId === listing.id}
                          className="p-2 text-status-error hover:bg-status-error/10 rounded-lg transition disabled:opacity-50 cursor-pointer"
                          title={t("delete")}
                        >
                          <MdDeleteOutline size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
