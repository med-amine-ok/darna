"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { Listing, User } from "@/types";
import { updateListing, deleteListing } from "@/lib/data/listings";
import {
  BrandSearchIcon,
  BrandFilterIcon,
  BrandPlusIcon,
  BrandCalendarIcon,
  BrandEditIcon,
  BrandTrashIcon,
  BrandEyeIcon,
  BrandGridIcon,
  BrandListIcon,
  BrandStarIcon,
  BrandCheckIcon,
  BrandMoreIcon,
  BrandBedIcon,
  BrandCloseIcon,
  CategoryHouseIcon,
  InstantBookingIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import HostWalletWidget from "@/components/host/HostWalletWidget";

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
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal state
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editInstantBook, setEditInstantBook] = useState<boolean>(true);
  const [editTitle, setEditTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Manage Room Types modal state (Section 2)
  const [managingRoomTypesListing, setManagingRoomTypesListing] = useState<Listing | null>(null);
  const [tempRoomTypes, setTempRoomTypes] = useState<NonNullable<Listing["roomTypes"]>>([]);
  const [isSavingRoomTypes, setIsSavingRoomTypes] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleOpenManageRoomTypes = (listing: Listing) => {
    setManagingRoomTypesListing(listing);
    setTempRoomTypes(listing.roomTypes ? JSON.parse(JSON.stringify(listing.roomTypes)) : []);
  };

  const handleSaveRoomTypes = async () => {
    if (!managingRoomTypesListing) return;
    setIsSavingRoomTypes(true);
    try {
      await updateListing(managingRoomTypesListing.id, { roomTypes: tempRoomTypes });
      setListings((prev) =>
        prev.map((l) =>
          l.id === managingRoomTypesListing.id ? { ...l, roomTypes: tempRoomTypes } : l
        )
      );
      toast.success("Room types & inventory updated successfully!");
      setManagingRoomTypesListing(null);
    } catch {
      toast.error("Failed to update room types.");
    } finally {
      setIsSavingRoomTypes(false);
    }
  };

  // Delete listing
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const success = await deleteListing(id);
      if (success) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        toast.success("Listing deleted from your fleet.");
        setDeletingId(null);
      }
    } catch {
      toast.error("Failed to delete listing.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const isIndividual = currentUser?.hostType === "individual";
  const activeCount = listings.filter((l) => l.status === "active").length;
  const draftCount = listings.filter((l) => l.status !== "active").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            {isIndividual ? "My Listings" : "Host Properties & Fleet"}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {isIndividual
              ? "Manage your homes, nightly pricing, and calendar booking availability."
              : "Manage your listings, adjust nightly rates in DZD, and control calendar booking availability."}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {currentUser?.hostType === "agency" && (
            <button
              type="button"
              onClick={() => router.push("/host/agency/trips/new")}
              className="px-4 py-2.5 bg-secondary/15 hover:bg-secondary/25 text-secondary rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer btn-press"
            >
              <BrandPlusIcon size={16} />
              <span>+ Add a Trip</span>
            </button>
          )}

          {/* Create Listing CTA */}
          <button
            type="button"
            onClick={() => router.push("/become-a-host/1")}
            className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm cursor-pointer btn-press"
          >
            <BrandPlusIcon size={18} className="text-tertiary" />
            <span>{isIndividual ? "Add New Listing" : "Create New Listing"}</span>
          </button>
        </div>
      </div>

      {/* Host Balance & Solvency Widget */}
      <HostWalletWidget
        ownerId={currentUser?.organizationId || currentUser?.id || "usr_amina"}
        ownerType={currentUser?.organizationId ? "organization" : "user"}
        hostType={currentUser?.hostType || "individual"}
        className="mb-6"
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
            {isIndividual ? "Total Listings" : "Total Fleet"}
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
            4.94 <BrandStarIcon size={18} className="text-amber-500 fill-amber-500" />
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 mb-6 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <BrandSearchIcon
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
              <BrandGridIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table" ? "bg-white text-primary shadow-2xs" : "text-neutral-400"
              }`}
              title="Table view"
            >
              <BrandListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Listings Content */}
      {filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-12 text-center shadow-2xs">
          <CategoryHouseIcon
            size={44}
            className="mx-auto text-tertiary mb-3 opacity-60"
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
                      <BrandStarIcon size={12} className="text-accent fill-accent" />
                      <span>{listing.rating || "5.0"} ({listing.reviewCount || 0})</span>
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-primary text-base line-clamp-1 mb-2">
                    {listing.title}
                  </h3>

                  {listing.roomTypes && listing.roomTypes.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1">
                        <BrandBedIcon size={12} />
                        <span>
                          {listing.roomTypes.length} {listing.businessCategory === "hostel" ? "Units / Dorms" : "Room Types"}
                        </span>
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {listing.roomTypes.reduce((acc, r) => acc + (r.inventoryCount ?? r.totalInventory ?? 0), 0)} total {listing.businessCategory === "hostel" ? "beds" : "rooms"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-lg font-black font-mono text-primary">
                      {listing.price.toLocaleString()} DZD
                    </span>
                    <span className="text-xs text-neutral-500">
                      {listing.roomTypes && listing.roomTypes.some((r) => r.bookingUnit === "bed") ? "/ bed" : "/ night"}
                    </span>
                    {listing.instantBook && (
                      <span className="ms-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                        <InstantBookingIcon size={12} className="text-emerald-700" />
                        <span>Instant Book</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Primary Edit & Calendar + Kebab Overflow (Section 4 UX Audit) */}
                <div className="border-t border-tertiary/50 pt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(listing)}
                      className="px-3 py-1.5 rounded-xl border border-tertiary/80 hover:bg-neutral-50 text-neutral-700 transition flex items-center gap-1.5 text-xs font-bold"
                      title="Quick edit rate & details"
                    >
                      <BrandEditIcon size={15} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/host/calendar`)}
                      className="px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5"
                      title="Open calendar"
                    >
                      <BrandCalendarIcon size={15} className="text-secondary" />
                      <span>Calendar</span>
                    </button>
                  </div>

                  {/* Kebab Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenCardMenuId(openCardMenuId === listing.id ? null : listing.id)}
                      className="p-1.5 rounded-xl border border-tertiary/70 hover:bg-neutral-100 text-neutral-600 transition"
                      title="More actions"
                      aria-label="More actions"
                    >
                      <BrandMoreIcon size={16} />
                    </button>

                    {openCardMenuId === listing.id && (
                      <div className="absolute end-0 bottom-full mb-2 w-52 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenCardMenuId(null);
                            handleToggleStatus(listing);
                          }}
                          className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                        >
                          <BrandFilterIcon size={15} className="text-secondary" />
                          <span>{listing.status === "active" ? "Pause Listing" : "Activate Listing"}</span>
                        </button>

                        {listing.roomTypes && listing.roomTypes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenCardMenuId(null);
                              handleOpenManageRoomTypes(listing);
                            }}
                            className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                          >
                            <BrandBedIcon size={15} className="text-secondary" />
                            <span>Manage Room Types</span>
                          </button>
                        )}

                        <Link
                          href={`/listings/${listing.id}`}
                          target="_blank"
                          onClick={() => setOpenCardMenuId(null)}
                          className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                        >
                          <BrandEyeIcon size={15} className="text-secondary" />
                          <span>View Public Page</span>
                        </Link>

                        <hr className="my-1 border-tertiary/30" />

                        <button
                          type="button"
                          onClick={() => {
                            setOpenCardMenuId(null);
                            setDeletingId(listing.id);
                          }}
                          className="w-full text-start px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold"
                        >
                          <BrandTrashIcon size={15} />
                          <span>Delete Listing</span>
                        </button>
                      </div>
                    )}
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
                      <span className="inline-flex items-center gap-1">
                        <BrandStarIcon size={12} className="text-accent fill-accent" />
                        <span>{listing.rating || "5.0"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(listing)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-700"
                          title="Edit"
                        >
                          <BrandEditIcon size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/host/calendar`)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-secondary"
                          title="Calendar"
                        >
                          <BrandCalendarIcon size={16} />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenCardMenuId(openCardMenuId === `tbl-${listing.id}` ? null : `tbl-${listing.id}`)}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600"
                            title="More actions"
                          >
                            <BrandMoreIcon size={16} />
                          </button>
                          {openCardMenuId === `tbl-${listing.id}` && (
                            <div className="absolute end-0 top-8 w-44 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in">
                              <Link
                                href={`/listings/${listing.id}`}
                                target="_blank"
                                onClick={() => setOpenCardMenuId(null)}
                                className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                              >
                                <BrandEyeIcon size={14} className="text-secondary" />
                                <span>View Public</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleToggleStatus(listing);
                                }}
                                className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold"
                              >
                                <BrandFilterIcon size={14} className="text-secondary" />
                                <span>{listing.status === "active" ? "Pause" : "Activate"}</span>
                              </button>
                              <hr className="my-1 border-tertiary/30" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  setDeletingId(listing.id);
                                }}
                                className="w-full text-start px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-semibold"
                              >
                                <BrandTrashIcon size={14} />
                                <span>Delete</span>
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
                <BrandCloseIcon size={16} />
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

      {/* Manage Room Types Modal (Section 2: Hotel & Hostel) */}
      {managingRoomTypesListing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-tertiary shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-tertiary/60 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
                  <BrandBedIcon size={22} className="text-secondary" />
                  <span>Manage Room Types & Inventory</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {managingRoomTypesListing.title} · {managingRoomTypesListing.businessCategory === "hostel" ? "Hostel" : "Hotel"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingRoomTypesListing(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition"
              >
                <BrandCloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {tempRoomTypes.map((rt, index) => (
                <div
                  key={rt.id || index}
                  className="p-4 rounded-2xl bg-neutral-50/70 border border-tertiary/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-primary flex items-center gap-2">
                        <span>{rt.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary/15 text-secondary">
                          {rt.bookingUnit === "bed" ? "Per Bed" : "Per Room"}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {rt.bedsDescription || `Capacity: ${rt.capacity} guests`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Base Nightly Rate (DZD)
                      </label>
                      <input
                        type="number"
                        value={rt.basePrice ?? rt.price}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setTempRoomTypes((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, basePrice: val, price: val } : item))
                          );
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Available {rt.bookingUnit === "bed" ? "Beds" : "Rooms"} Inventory
                      </label>
                      <input
                        type="number"
                        value={rt.inventoryCount ?? rt.totalInventory}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setTempRoomTypes((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, inventoryCount: val, totalInventory: val } : item))
                          );
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-tertiary/50">
              <button
                type="button"
                onClick={() => setManagingRoomTypesListing(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoomTypes}
                disabled={isSavingRoomTypes}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs disabled:opacity-50"
              >
                {isSavingRoomTypes ? "Saving..." : "Save Inventory & Tariffs"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        variant="destructive"
        title="Delete Listing"
        message="Are you sure you want to delete this listing from DARNA? This action is permanent and will remove the property and its booking history from the platform."
        confirmLabel="Delete listing"
        cancelLabel="Keep listing"
        isLoading={isDeleting}
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
