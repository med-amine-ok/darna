"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { Listing, User } from "@/types";
import { updateListing, deleteListing } from "@/lib/data/listings";
import {
  HiOutlineHome,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineStar,
  HiOutlineCheckCircle,
  HiOutlineSwitchHorizontal,
} from "react-icons/hi";
import { toast } from "react-toastify";

interface HostListingsClientProps {
  initialListings: Listing[];
  currentUser?: User | null;
}

export default function HostListingsClient({
  initialListings,
  currentUser,
}: HostListingsClientProps) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedVertical, setSelectedVertical] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal state
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editInstantBook, setEditInstantBook] = useState<boolean>(true);
  const [editTitle, setEditTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (selectedVertical !== "all" && l.category !== selectedVertical) return false;
      if (selectedStatus !== "all" && l.status !== selectedStatus) return false;
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
  }, [listings, selectedVertical, selectedStatus, searchQuery]);

  // Toggle active status
  const handleToggleStatus = async (listing: Listing) => {
    const nextStatus = listing.status === "active" ? "draft" : "active";
    try {
      const updated = await updateListing(listing.id, { status: nextStatus });
      if (updated) {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, status: nextStatus } : l))
        );
        toast.info(`Listing status updated to ${nextStatus}.`);
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // Open edit modal
  const handleOpenEdit = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditPrice(listing.price);
    setEditInstantBook(listing.instantBook ?? true);
  };

  // Save quick edits
  const handleSaveEdit = async () => {
    if (!editingListing) return;
    setIsSaving(true);
    try {
      const updated = await updateListing(editingListing.id, {
        title: editTitle,
        price: editPrice,
        instantBook: editInstantBook,
      });
      if (updated) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === editingListing.id
              ? { ...l, title: editTitle, price: editPrice, instantBook: editInstantBook }
              : l
          )
        );
        toast.success("Listing details updated successfully!");
        setEditingListing(null);
      }
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete listing
  const handleDelete = async (id: string) => {
    try {
      const success = await deleteListing(id);
      if (success) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        toast.success("Listing deleted from your fleet.");
        setDeletingId(null);
      }
    } catch {
      toast.error("Failed to delete listing.");
    }
  };

  // Stats
  const activeCount = listings.filter((l) => l.status === "active").length;
  const draftCount = listings.filter((l) => l.status !== "active").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Host Properties & Fleet
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Manage your listings, adjust nightly rates in DZD, and control calendar booking availability.
          </p>
        </div>

        {/* Create Listing CTA */}
        <button
          type="button"
          onClick={() => router.push("/become-a-host/1")}
          className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm self-start md:self-auto"
        >
          <HiOutlinePlus size={18} className="text-tertiary" />
          <span>Create New Listing</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Total Fleet
          </span>
          <span className="text-2xl font-black text-primary">{listings.length}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Online & Active
          </span>
          <span className="text-2xl font-black text-emerald-700">{activeCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-amber-600 uppercase tracking-wider">
            In Draft / Paused
          </span>
          <span className="text-2xl font-black text-amber-700">{draftCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-secondary uppercase tracking-wider">
            Avg Rating
          </span>
          <span className="text-2xl font-black text-secondary flex items-center gap-1">
            4.94 <HiOutlineStar size={18} className="text-amber-500 fill-amber-500" />
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 mb-6 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <HiOutlineSearch
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or wilaya..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter selectors & View Toggle */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap justify-between lg:justify-end">
          {/* Vertical filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="category-select" className="sr-only">Category</label>
            <select
              id="category-select"
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              <option value="home">Homes & Stays</option>
              <option value="experience">Sahara & Culture</option>
              <option value="vehicle">4x4 Vehicles</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="status-select" className="sr-only">Status</label>
            <select
              id="status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft / Paused</option>
            </select>
          </div>

          {/* Grid/Table Switcher */}
          <div className="flex items-center border border-tertiary/80 rounded-xl p-0.5 bg-neutral-50">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid" ? "bg-white text-primary shadow-2xs" : "text-neutral-400"
              }`}
              title="Grid view"
            >
              <HiOutlineViewGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table" ? "bg-white text-primary shadow-2xs" : "text-neutral-400"
              }`}
              title="Table view"
            >
              <HiOutlineViewList size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Listings Content */}
      {filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-12 text-center shadow-2xs">
          <Image
            src="/assets/house.png"
            alt="Listings"
            width={44}
            height={44}
            className="mx-auto opacity-40 mb-3 object-contain"
          />
          <h3 className="font-serif text-lg font-bold text-primary mb-1">No listings found</h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto mb-4">
            Try resetting your search filters or create a new property listing.
          </p>
          <button
            type="button"
            onClick={() => router.push("/become-a-host/1")}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs"
          >
            Create New Listing
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-3xl border border-tertiary/70 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col group"
            >
              {/* Image & Status Badge */}
              <div className="relative h-48 w-full bg-neutral-100">
                <Image
                  src={
                    listing.imageSrc?.[0] ||
                    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
                  }
                  alt={listing.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />

                {/* Status chip */}
                <div className="absolute top-3 start-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs flex items-center gap-1.5 ${
                      listing.status === "active"
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-800/80 text-white backdrop-blur-xs"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        listing.status === "active" ? "bg-white animate-pulse" : "bg-neutral-400"
                      }`}
                    />
                    {listing.status === "active" ? "Active" : "Paused / Draft"}
                  </span>
                </div>

                {/* Category chip */}
                <div className="absolute top-3 end-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-xs text-primary shadow-xs capitalize">
                    {listing.category}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                    <span>
                      {listing.city}, {listing.country}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-neutral-700">
                      ★ {listing.rating || "5.0"} ({listing.reviewCount || 0})
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-primary text-base line-clamp-1 mb-2">
                    {listing.title}
                  </h3>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-lg font-black font-mono text-primary">
                      {listing.price.toLocaleString()} DZD
                    </span>
                    <span className="text-xs text-neutral-500">/ night</span>
                    {listing.instantBook && (
                      <span className="ms-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ⚡ Instant Book
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="border-t border-tertiary/50 pt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(listing)}
                      className="p-2 rounded-xl border border-tertiary/70 hover:bg-neutral-50 text-neutral-700 transition"
                      title={listing.status === "active" ? "Pause listing" : "Activate listing"}
                    >
                      <HiOutlineSwitchHorizontal size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(listing)}
                      className="p-2 rounded-xl border border-tertiary/70 hover:bg-neutral-50 text-neutral-700 transition"
                      title="Quick edit rate & details"
                    >
                      <HiOutlinePencilAlt size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingId(listing.id)}
                      className="p-2 rounded-xl border border-tertiary/70 hover:bg-rose-50 text-rose-600 transition"
                      title="Delete listing"
                    >
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/host/calendar`)}
                      className="px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1"
                    >
                      <HiOutlineCalendar size={14} className="text-secondary" />
                      <span>Calendar</span>
                    </button>

                    <Link
                      href={`/listings/${listing.id}`}
                      target="_blank"
                      className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition"
                      title="View public listing page"
                    >
                      <HiOutlineEye size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-tertiary/70 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-start">Property</th>
                  <th className="py-3 px-4 text-start">Type</th>
                  <th className="py-3 px-4 text-start">Status</th>
                  <th className="py-3 px-4 text-start">Nightly Rate</th>
                  <th className="py-3 px-4 text-start">Bookings</th>
                  <th className="py-3 px-4 text-start">Rating</th>
                  <th className="py-3 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/40">
                {filteredListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                          <Image
                            src={listing.imageSrc?.[0] || "/assets/hero.jpg"}
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-primary truncate max-w-[200px]">
                            {listing.title}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {listing.city}, {listing.country}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold text-neutral-600">
                      {listing.category}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(listing)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          listing.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {listing.status === "active" ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {listing.price.toLocaleString()} DZD
                    </td>
                    <td className="py-3 px-4 text-neutral-600 font-semibold">
                      {listing.bookingsCount || 12} stays
                    </td>
                    <td className="py-3 px-4 font-bold text-neutral-700">
                      ★ {listing.rating || "5.0"}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(listing)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-700"
                          title="Edit"
                        >
                          <HiOutlinePencilAlt size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/host/calendar`)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-secondary"
                          title="Calendar"
                        >
                          <HiOutlineCalendar size={16} />
                        </button>
                        <Link
                          href={`/listings/${listing.id}`}
                          target="_blank"
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-700"
                          title="View"
                        >
                          <HiOutlineEye size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeletingId(listing.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600"
                          title="Delete"
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/60 mb-4">
              <h3 className="font-serif text-lg font-black text-primary">
                Quick Edit Listing
              </h3>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Listing Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Base Nightly Rate (DZD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm font-mono font-bold text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    DZD
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-tertiary/60">
                <div>
                  <span className="block text-xs font-bold text-primary">Instant Book</span>
                  <span className="text-[11px] text-neutral-500">
                    Allow guests to book without manual host confirmation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editInstantBook}
                  onChange={(e) => setEditInstantBook(e.target.checked)}
                  className="w-5 h-5 text-primary rounded focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-lg font-bold text-primary mb-2">
              Confirm Delete Listing
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-6">
              Are you sure you want to delete this listing from DARNA? This action is irreversible
              and will unpublish the listing from guest searches.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-2xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
