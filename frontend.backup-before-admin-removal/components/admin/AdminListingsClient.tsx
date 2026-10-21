"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Listing } from "@/types";
import { updateListing, deleteListing } from "@/lib/data/listings";
import { logAdminAction } from "@/lib/data/admin";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import {
  BrandSearchIcon,
  BrandStarIcon,
  BrandBanIcon,
  BrandTrashIcon,
  BrandEyeIcon,
  BrandSparklesIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandCrossIcon,
  BrandMoreIcon,
} from "@/components/icons";

interface AdminListingsClientProps {
  initialListings: Listing[];
}

export default function AdminListingsClient({ initialListings }: AdminListingsClientProps) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [searchQuery, setSearchQuery] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "price" | "rating" | "bookings">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Kebab overflow menu tracking
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);

  // Detail / Edit Drawer
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Dialog states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [suspendingListing, setSuspendingListing] = useState<Listing | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  // Filtering & Sorting
  const filteredListings = useMemo(() => {
    let result = listings.filter((l) => {
      if (verticalFilter !== "all" && l.category !== verticalFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.city.toLowerCase().includes(q) &&
          !l.locationValue.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "price") return b.price - a.price;
      if (sortBy === "rating") return (b.rating || 5) - (a.rating || 5);
      if (sortBy === "bookings") return (b.bookingsCount || 0) - (a.bookingsCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [listings, verticalFilter, statusFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredListings.length / pageSize) || 1;
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedListings.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Actions
  const handleToggleFeature = async (listing: Listing) => {
    const nextFeatured = !listing.featured;
    try {
      const updated = await updateListing(listing.id, { featured: nextFeatured });
      if (updated) {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, featured: nextFeatured } : l))
        );
        logAdminAction(
          "FEATURE_LISTING",
          "listing",
          listing.id,
          `${nextFeatured ? "Featured" : "Unfeatured"} listing: ${listing.title}`
        );
        toast.info(nextFeatured ? "Listing promoted to featured" : "Featured tag removed");
      }
    } catch {
      toast.error("Failed to update featured status.");
    }
  };

  const handleToggleSuspend = (listing: Listing) => {
    if (listing.status === "suspended") {
      executeToggleSuspend(listing, "active");
    } else {
      setSuspendingListing(listing);
    }
  };

  const executeToggleSuspend = async (listing: Listing, nextStatus: "active" | "suspended") => {
    setIsSuspending(true);
    try {
      const updated = await updateListing(listing.id, { status: nextStatus as any });
      if (updated) {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, status: nextStatus as any } : l))
        );
        logAdminAction(
          "SUSPEND_LISTING",
          "listing",
          listing.id,
          `${nextStatus === "suspended" ? "Suspended" : "Reactivated"} listing: ${listing.title}`
        );
        toast.info(`Listing status changed to ${nextStatus}.`);
      }
    } catch {
      toast.error("Failed to change status.");
    } finally {
      setIsSuspending(false);
      setSuspendingListing(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const success = await deleteListing(deletingId);
      if (success) {
        setListings((prev) => prev.filter((l) => l.id !== deletingId));
        logAdminAction("DELETE_LISTING", "listing", deletingId, `Deleted listing ID ${deletingId}`);
        toast.success("Listing permanently deleted from DARNA.");
      }
    } catch {
      toast.error("Failed to delete listing.");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // Bulk Actions
  const handleBulkFeature = async () => {
    for (const id of selectedIds) {
      await updateListing(id, { featured: true });
    }
    setListings((prev) =>
      prev.map((l) => (selectedIds.includes(l.id) ? { ...l, featured: true } : l))
    );
    toast.success(`Featured ${selectedIds.length} listings!`);
    setSelectedIds([]);
  };

  const handleBulkSuspend = async () => {
    for (const id of selectedIds) {
      await updateListing(id, { status: "suspended" as any });
    }
    setListings((prev) =>
      prev.map((l) => (selectedIds.includes(l.id) ? { ...l, status: "suspended" as any } : l))
    );
    toast.info(`Suspended ${selectedIds.length} listings.`);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Listings & Inventory Moderation
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Review host submissions, curate featured Algerian villas and desert camps, and moderate status.
          </p>
        </div>

        {/* Bulk Action Controls if items selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 p-2 rounded-2xl animate-in fade-in">
            <span className="text-xs font-bold text-primary px-2">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              onClick={handleBulkFeature}
              className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs"
            >
              Feature All
            </button>
            <button
              type="button"
              onClick={handleBulkSuspend}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition shadow-2xs"
            >
              Suspend All
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-neutral-500 hover:text-neutral-800"
            >
              <BrandCrossIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <BrandSearchIcon size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, wilaya, or description..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-between lg:justify-end">
          <label htmlFor="admin-category-filter" className="sr-only">Category</label>
          <select
            id="admin-category-filter"
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Categories</option>
            <option value="home">Homes & Stays</option>
            <option value="experience">Sahara Experiences</option>
            <option value="vehicle">4x4 Vehicles</option>
          </select>

          <label htmlFor="admin-status-filter" className="sr-only">Status</label>
          <select
            id="admin-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
            <option value="draft">In Draft</option>
          </select>

          <label htmlFor="admin-sort-by" className="sr-only">Sort by</label>
          <select
            id="admin-sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
          >
            <option value="date">Newest First</option>
            <option value="price">Highest Price</option>
            <option value="rating">Top Rated</option>
            <option value="bookings">Most Booked</option>
          </select>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      paginatedListings.length > 0 &&
                      paginatedListings.every((l) => selectedIds.includes(l.id))
                    }
                    className="w-4 h-4 rounded text-primary"
                  />
                </th>
                <th className="py-3 px-3 text-start">Listing & Destination</th>
                <th className="py-3 px-3 text-start">Category</th>
                <th className="py-3 px-3 text-start">Status</th>
                <th className="py-3 px-3 text-end">Rate / Night</th>
                <th className="py-3 px-3 text-center">Stays</th>
                <th className="py-3 px-3 text-center">Rating</th>
                <th className="py-3 px-3 text-end">Row Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {paginatedListings.map((listing) => (
                <tr key={listing.id} className="hover:bg-neutral-50/60 transition">
                  {/* Select */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(listing.id)}
                      onChange={() => handleSelectOne(listing.id)}
                      className="w-4 h-4 rounded text-primary"
                    />
                  </td>

                  {/* Thumbnail & Title */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                        <Image
                          src={listing.imageSrc?.[0] || "/assets/hero.jpg"}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary truncate max-w-[220px]">
                            {listing.title}
                          </span>
                          {listing.featured && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-accent text-white shrink-0">
                              Featured
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {listing.city}, Algeria • Host ID: {listing.hostUserId || listing.organizationId}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 capitalize font-semibold text-neutral-600 whitespace-nowrap">
                    {listing.category}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        listing.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : listing.status === "suspended"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {listing.status || "active"}
                    </span>
                  </td>

                  {/* Nightly Price */}
                  <td className="py-3 px-3 font-mono font-bold text-primary text-end whitespace-nowrap">
                    {listing.price.toLocaleString()} DZD
                  </td>

                  {/* Bookings */}
                  <td className="py-3 px-3 text-center font-semibold text-neutral-700 whitespace-nowrap">
                    {listing.bookingsCount || 12}
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-3 text-center font-bold text-neutral-700 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <BrandStarIcon size={12} className="text-accent fill-accent" />
                      <span>{listing.rating || "5.0"}</span>
                    </span>
                  </td>

                  {/* Row Actions: Primary View + Kebab Overflow (Section 4 UX Audit) */}
                  <td className="py-3 px-3 text-end relative whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Primary Inspect / View Action */}
                      <Link
                        href={`/listings/${listing.id}`}
                        target="_blank"
                        className="px-2.5 py-1 rounded-lg border border-tertiary/80 hover:bg-neutral-100 text-primary text-xs font-semibold flex items-center gap-1 transition"
                        title="View public page in new tab"
                      >
                        <BrandEyeIcon size={14} />
                        <span>View</span>
                      </Link>

                      {/* Kebab Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenKebabId(openKebabId === listing.id ? null : listing.id)}
                          className="p-1.5 rounded-lg border border-tertiary/70 hover:bg-neutral-100 text-neutral-600 transition"
                          title="More actions"
                          aria-label="More actions"
                        >
                          <BrandMoreIcon size={15} />
                        </button>

                        {openKebabId === listing.id && (
                          <div className="absolute end-0 top-8 w-48 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenKebabId(null);
                                handleToggleFeature(listing);
                              }}
                              className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                            >
                              <BrandSparklesIcon size={14} className={listing.featured ? "text-amber-500" : "text-neutral-400"} />
                              <span>{listing.featured ? "Remove Featured" : "Mark as Featured"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenKebabId(null);
                                handleToggleSuspend(listing);
                              }}
                              className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                            >
                              <BrandBanIcon size={14} className={listing.status === "suspended" ? "text-emerald-600" : "text-rose-600"} />
                              <span>{listing.status === "suspended" ? "Reactivate Listing" : "Suspend Listing"}</span>
                            </button>

                            <hr className="my-1 border-tertiary/30" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenKebabId(null);
                                handleDelete(listing.id);
                              }}
                              className="w-full text-start px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold"
                            >
                              <BrandTrashIcon size={14} />
                              <span>Delete Listing</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-neutral-50 border-t border-tertiary/60 flex items-center justify-between text-xs">
          <span className="text-neutral-500">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredListings.length)} of{" "}
            {filteredListings.length} listings
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-tertiary/80 hover:bg-white disabled:opacity-40"
            >
              <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
            </button>
            <span className="font-bold text-primary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-tertiary/80 hover:bg-white disabled:opacity-40"
            >
              <BrandChevronRightIcon size={16} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Listing Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        variant="destructive"
        title="Permanently Delete Listing"
        message="This will permanently delete this listing and remove it from search results and fleet operations. This action cannot be undone."
        confirmLabel="Delete listing"
        cancelLabel="Keep listing"
        isLoading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* Suspend Listing Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!suspendingListing}
        variant="destructive"
        title="Suspend Listing"
        message={
          suspendingListing
            ? `Are you sure you want to suspend "${suspendingListing.title}"? The property will be removed from marketplace search and travelers won't be able to book it until reactivated.`
            : ""
        }
        confirmLabel="Suspend listing"
        cancelLabel="Keep active"
        isLoading={isSuspending}
        onConfirm={() => {
          if (suspendingListing) executeToggleSuspend(suspendingListing, "suspended");
        }}
        onCancel={() => setSuspendingListing(null)}
      />
    </div>
  );
}
