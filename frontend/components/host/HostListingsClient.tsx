"use client";

import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import React, { useState, useMemo, useEffect, useId } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Listing, User } from "@/types";
import { updateMyListingAction, deleteMyListingAction } from "@/app/actions/listings";
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
  BrandMoreIcon,
  BrandBedIcon,
  BrandCloseIcon,
  CategoryHouseIcon,
  InstantBookingIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import { useLocale, useTranslations } from "next-intl";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import HostWalletWidget from "@/components/host/HostWalletWidget";
import { formatDzd } from "@/lib/currency";
import { formatNumber, formatRating as formatRatingValue } from "@/lib/i18n/date-locale";
import { useDialogA11y } from "@/hook/useDialogA11y";
import { useActionError } from "@/hook/useActionError";

interface HostListingsClientProps {
  initialListings: Listing[];
  currentUser?: User | null;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const INPUT_FOCUS = "focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600";
const LISTING_CATEGORIES = ["home", "hotel", "experience", "vehicle", "trip"];
const FALLBACK_LISTING_IMAGE = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914";

export default function HostListingsClient({
  initialListings,
  currentUser,
}: HostListingsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("hostListings");
  const tListing = useTranslations("listing");
  const errorText = useActionError();
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
  const [editErrors, setEditErrors] = useState<{ title?: boolean; price?: boolean }>({});

  // Manage Room Types modal state (Section 2)
  const [managingRoomTypesListing, setManagingRoomTypesListing] = useState<Listing | null>(null);
  const [tempRoomTypes, setTempRoomTypes] = useState<NonNullable<Listing["roomTypes"]>>([]);
  const [isSavingRoomTypes, setIsSavingRoomTypes] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const baseId = useId();
  const ids = {
    search: `${baseId}-search`,
    category: `${baseId}-category`,
    status: `${baseId}-status`,
    results: `${baseId}-results`,
    editTitle: `${baseId}-edit-title`,
    editTitleInput: `${baseId}-edit-title-input`,
    editTitleError: `${baseId}-edit-title-error`,
    editPrice: `${baseId}-edit-price`,
    editPriceError: `${baseId}-edit-price-error`,
    editPriceSuffix: `${baseId}-edit-price-suffix`,
    editInstant: `${baseId}-edit-instant`,
    editInstantHint: `${baseId}-edit-instant-hint`,
    roomTypesTitle: `${baseId}-room-types-title`,
  };
  const menuId = (key: string) => `${baseId}-menu-${key}`;
  const menuTriggerId = (key: string) => `${baseId}-menu-trigger-${key}`;

  const closeEdit = () => {
    setEditingListing(null);
    setEditErrors({});
  };
  const closeRoomTypes = () => setManagingRoomTypesListing(null);
  const editDialogRef = useDialogA11y<HTMLDivElement>(!!editingListing, {
    onEscape: isSaving ? undefined : closeEdit,
  });
  const roomTypesDialogRef = useDialogA11y<HTMLDivElement>(!!managingRoomTypesListing, {
    onEscape: isSavingRoomTypes ? undefined : closeRoomTypes,
  });

  // Close the open actions menu on Escape (returning focus to its trigger) or on outside click.
  useEffect(() => {
    if (!openCardMenuId) return;
    const key = openCardMenuId;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenCardMenuId(null);
      document.getElementById(`${baseId}-menu-trigger-${key}`)?.focus();
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const menu = document.getElementById(`${baseId}-menu-${key}`);
      const trigger = document.getElementById(`${baseId}-menu-trigger-${key}`);
      if (menu?.contains(target) || trigger?.contains(target)) return;
      setOpenCardMenuId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [openCardMenuId, baseId]);

  const money = (amount: number) => formatDzd(amount, locale);
  const ratedListings = listings.filter((l) => l.rating && l.rating > 0);
  const ratingWeight = ratedListings.reduce((sum, l) => sum + (l.reviewCount || 1), 0);
  const averageRating = ratingWeight
    ? formatRatingValue(ratedListings.reduce((sum, l) => sum + (l.rating || 0) * (l.reviewCount || 1), 0) / ratingWeight, locale)
    : null;
  const categoryLabel = (category: string) =>
    LISTING_CATEGORIES.includes(category) ? t(`category.${category}`) : category;
  const kindOf = (listing: Listing) => (listing.businessCategory === "hostel" ? "hostel" : "other");

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
      const result = await updateMyListingAction(listing.id, { status: nextStatus });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setListings((prev) => prev.map((l) => (l.id === listing.id ? result.data : l)));
      toast.info(t("toast.statusUpdated", { status: nextStatus }));
    } catch {
      toast.error(t("toast.statusFailed"));
    }
  };

  // Open edit modal
  const handleOpenEdit = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditPrice(listing.price);
    setEditInstantBook(listing.instantBook ?? true);
    setEditErrors({});
  };

  const priceRange = { min: money(PRICE_MIN_DZD), max: money(PRICE_MAX_DZD) };

  // Save quick edits
  const handleSaveEdit = async () => {
    if (!editingListing) return;
    setIsSaving(true);
    try {
      const errors = { title: !editTitle.trim(), price: !isValidPriceDzd(editPrice) };
      setEditErrors(errors);
      if (errors.title || errors.price) {
        toast.error(t("toast.invalidEdit", priceRange));
        return;
      }
      const result = await updateMyListingAction(editingListing.id, {
        title: editTitle,
        price: editPrice,
        instantBook: editInstantBook,
      });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setListings((prev) => prev.map((l) => (l.id === editingListing.id ? result.data : l)));
      toast.success(t("toast.saved"));
      closeEdit();
    } catch {
      toast.error(t("toast.saveFailed"));
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
      const result = await updateMyListingAction(managingRoomTypesListing.id, { roomTypes: tempRoomTypes });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setListings((prev) =>
        prev.map((l) => (l.id === managingRoomTypesListing.id ? result.data : l))
      );
      toast.success(t("toast.roomTypesSaved"));
      setManagingRoomTypesListing(null);
    } catch {
      toast.error(t("toast.roomTypesFailed"));
    } finally {
      setIsSavingRoomTypes(false);
    }
  };

  // Delete listing
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteMyListingAction(id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success(t("toast.deleted"));
      setDeletingId(null);
      router.refresh();
    } catch {
      toast.error(t("toast.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const isIndividual = currentUser?.hostType === "individual";
  const activeCount = listings.filter((l) => l.status === "active").length;
  const draftCount = listings.filter((l) => l.status !== "active").length;

  const menuItemClass = `w-full text-start px-3.5 py-2 hover:bg-neutral-50 focus-visible:bg-neutral-100 focus-visible:outline-none flex items-center gap-2 font-semibold`;

  const toggleMenu = (key: string) => setOpenCardMenuId(openCardMenuId === key ? null : key);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            {isIndividual ? t("titleIndividual") : t("titleAgency")}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {isIndividual ? t("subtitleIndividual") : t("subtitleAgency")}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {currentUser?.hostType === "agency" && (
            <Link
              href="/host/agency/trips/new"
              className={`px-4 py-2.5 bg-secondary/15 hover:bg-secondary/25 text-secondary rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer btn-press ${FOCUS_RING}`}
            >
              <BrandPlusIcon size={16} />
              <span>{t("addTrip")}</span>
            </Link>
          )}

          {/* Create Listing CTA */}
          <Link
            href="/become-a-host/1"
            className={`px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm cursor-pointer btn-press ${FOCUS_RING}`}
          >
            <BrandPlusIcon size={18} className="text-tertiary" />
            <span>{isIndividual ? t("addListing") : t("createListing")}</span>
          </Link>
        </div>
      </div>

      {/* Host Balance & Solvency Widget */}
      <HostWalletWidget className="mb-6" />

      {/* KPI Stats Strip */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
            {isIndividual ? t("stats.totalListings") : t("stats.totalFleet")}
          </dt>
          <dd className="text-2xl font-black text-primary">{formatNumber(listings.length, locale)}</dd>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">{t("stats.active")}</dt>
          <dd className="text-2xl font-black text-emerald-700">{formatNumber(activeCount, locale)}</dd>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-amber-700 uppercase tracking-wider">{t("stats.draft")}</dt>
          <dd className="text-2xl font-black text-amber-700">{formatNumber(draftCount, locale)}</dd>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <dt className="block text-xs font-bold text-secondary uppercase tracking-wider">{t("stats.avgRating")}</dt>
          <dd className="text-2xl font-black text-secondary flex items-center gap-1">
            {averageRating ? (
              <>
                {averageRating} <BrandStarIcon size={18} className="text-amber-500 fill-amber-500" />
              </>
            ) : (
              tListing("ratingNew")
            )}
          </dd>
        </div>
      </dl>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 mb-6 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <label htmlFor={ids.search} className="sr-only">
            {t("searchLabel")}
          </label>
          <BrandSearchIcon
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            id={ids.search}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-controls={ids.results}
            className={`w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary placeholder:text-neutral-500 ${INPUT_FOCUS}`}
          />
        </div>

        {/* Filter selectors & View Toggle */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap justify-between lg:justify-end">
          {/* Vertical filter */}
          <div className="flex items-center gap-1">
            <label htmlFor={ids.category} className="sr-only">
              {t("filters.categoryLabel")}
            </label>
            <select
              id={ids.category}
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              aria-controls={ids.results}
              className={`px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary ${INPUT_FOCUS}`}
            >
              <option value="all">{t("filters.allCategories")}</option>
              <option value="home">{t("filters.home")}</option>
              <option value="experience">{t("filters.experience")}</option>
              <option value="vehicle">{t("filters.vehicle")}</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            <label htmlFor={ids.status} className="sr-only">
              {t("filters.statusLabel")}
            </label>
            <select
              id={ids.status}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-controls={ids.results}
              className={`px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary ${INPUT_FOCUS}`}
            >
              <option value="all">{t("filters.allStatuses")}</option>
              <option value="active">{t("filters.activeOnly")}</option>
              <option value="draft">{t("filters.draft")}</option>
            </select>
          </div>

          {/* Grid/Table Switcher */}
          <div
            role="group"
            aria-label={t("viewModeLabel")}
            className="flex items-center border border-tertiary/80 rounded-xl p-0.5 bg-neutral-50"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label={t("gridView")}
              title={t("gridView")}
              className={`p-1.5 rounded-lg transition ${FOCUS_RING} ${
                viewMode === "grid" ? "bg-white text-primary shadow-2xs" : "text-neutral-500"
              }`}
            >
              <BrandGridIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              aria-label={t("tableView")}
              title={t("tableView")}
              className={`p-1.5 rounded-lg transition ${FOCUS_RING} ${
                viewMode === "table" ? "bg-white text-primary shadow-2xs" : "text-neutral-500"
              }`}
            >
              <BrandListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Listings Content */}
      <div id={ids.results}>
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-tertiary/70 p-12 text-center shadow-2xs">
            <CategoryHouseIcon size={44} className="mx-auto text-tertiary mb-3 opacity-60" />
            <h2 className="font-serif text-lg font-bold text-primary mb-1">{t("emptyTitle")}</h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto mb-4">{t("emptyText")}</p>
            <Link
              href="/become-a-host/1"
              className={`inline-block px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs ${FOCUS_RING}`}
            >
              {t("createListing")}
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const menuKey = listing.id;
              const isMenuOpen = openCardMenuId === menuKey;
              const roomTypeCount = listing.roomTypes?.length ?? 0;
              return (
                <li
                  key={listing.id}
                  className="bg-white rounded-3xl border border-tertiary/70 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col group"
                >
                  {/* Image & Status Badge */}
                  <div className="relative h-48 w-full bg-neutral-100">
                    <Link
                      href={`/listings/${listing.id}`}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="absolute inset-0 overflow-hidden"
                    >
                      <Image
                        src={listing.imageSrc?.[0] || FALLBACK_LISTING_IMAGE}
                        alt={t("imageAlt", { title: listing.title })}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    </Link>

                    {/* Status chip */}
                    <div className="absolute top-3 start-3 pointer-events-none">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs flex items-center gap-1.5 ${
                          listing.status === "active"
                            ? "bg-emerald-700 text-white"
                            : "bg-neutral-800/90 text-white backdrop-blur-xs"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`w-2 h-2 rounded-full ${
                            listing.status === "active" ? "bg-white animate-pulse" : "bg-neutral-400"
                          }`}
                        />
                        {listing.status === "active" ? t("status.active") : t("status.pausedDraft")}
                      </span>
                    </div>

                    {/* Category chip */}
                    <div className="absolute top-3 end-3 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-xs text-primary shadow-xs">
                        {categoryLabel(listing.category)}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                        <span>{t("location", { city: listing.city, country: listing.country })}</span>
                        <span className="flex items-center gap-1 font-bold text-neutral-700">
                          {formatRatingValue(listing.rating, locale) ? (
                            <>
                              <BrandStarIcon size={12} className="text-accent fill-accent" />
                              <span>
                                {t("ratingWithCount", {
                                  rating: formatRatingValue(listing.rating, locale) ?? "",
                                  count: formatNumber(listing.reviewCount || 0, locale),
                                })}
                              </span>
                            </>
                          ) : (
                            tListing("ratingNew")
                          )}
                        </span>
                      </div>

                      <h2 className="font-serif font-bold text-primary text-base line-clamp-1 mb-2">
                        <Link
                          href={`/listings/${listing.id}`}
                          className={`hover:underline rounded ${FOCUS_RING}`}
                        >
                          {listing.title}
                        </Link>
                      </h2>

                      {roomTypeCount > 0 && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1">
                            <BrandBedIcon size={12} />
                            <span>{t("roomTypesCount", { kind: kindOf(listing), count: roomTypeCount })}</span>
                          </span>
                          <span className="text-[11px] text-neutral-600">
                            {t("inventoryTotal", {
                              kind: kindOf(listing),
                              count: (listing.roomTypes ?? []).reduce(
                                (acc, r) => acc + (r.inventoryCount ?? r.totalInventory ?? 0),
                                0
                              ),
                            })}
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-lg font-black font-mono text-primary">{money(listing.price)}</span>
                        <span className="text-xs text-neutral-600">
                          {listing.roomTypes && listing.roomTypes.some((r) => r.bookingUnit === "bed")
                            ? t("perBed")
                            : t("perNight")}
                        </span>
                        {listing.instantBook && (
                          <span className="ms-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <InstantBookingIcon size={12} className="text-emerald-700" />
                            <span>{t("instantBook")}</span>
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
                          aria-haspopup="dialog"
                          className={`px-3 py-1.5 rounded-xl border border-tertiary/80 hover:bg-neutral-50 text-neutral-700 transition flex items-center gap-1.5 text-xs font-bold ${FOCUS_RING}`}
                          title={t("editTitle")}
                        >
                          <BrandEditIcon size={15} />
                          <span>{t("edit")}</span>
                        </button>

                        <Link
                          href="/host/calendar"
                          className={`px-3 py-1.5 rounded-xl border border-tertiary/80 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5 ${FOCUS_RING}`}
                          title={t("calendarTitle")}
                        >
                          <BrandCalendarIcon size={15} className="text-secondary" />
                          <span>{t("calendar")}</span>
                        </Link>
                      </div>

                      {/* Kebab Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          id={menuTriggerId(menuKey)}
                          onClick={() => toggleMenu(menuKey)}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-controls={isMenuOpen ? menuId(menuKey) : undefined}
                          aria-label={t("moreActionsAria", { title: listing.title })}
                          title={t("moreActions")}
                          className={`p-1.5 rounded-xl border border-tertiary/70 hover:bg-neutral-100 text-neutral-600 transition ${FOCUS_RING}`}
                        >
                          <BrandMoreIcon size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            id={menuId(menuKey)}
                            role="menu"
                            aria-labelledby={menuTriggerId(menuKey)}
                            className="absolute end-0 bottom-full mb-2 w-52 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                handleToggleStatus(listing);
                              }}
                              className={menuItemClass}
                            >
                              <BrandFilterIcon size={15} className="text-secondary" />
                              <span>{listing.status === "active" ? t("menu.pause") : t("menu.activate")}</span>
                            </button>

                            {roomTypeCount > 0 && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleOpenManageRoomTypes(listing);
                                }}
                                className={menuItemClass}
                              >
                                <BrandBedIcon size={15} className="text-secondary" />
                                <span>{t("menu.manageRoomTypes")}</span>
                              </button>
                            )}

                            <Link
                              href={`/listings/${listing.id}`}
                              target="_blank"
                              role="menuitem"
                              onClick={() => setOpenCardMenuId(null)}
                              className={menuItemClass}
                            >
                              <BrandEyeIcon size={15} className="text-secondary" />
                              <span>{t("menu.viewPublic")}</span>
                            </Link>

                            <hr className="my-1 border-tertiary/30" role="separator" />

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setDeletingId(listing.id);
                              }}
                              className={`${menuItemClass} hover:bg-rose-50 text-rose-700`}
                            >
                              <BrandTrashIcon size={15} />
                              <span>{t("menu.delete")}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-3xl border border-tertiary/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4 text-start">{t("table.property")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{t("table.type")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{t("table.status")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{t("table.rate")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{t("table.bookings")}</th>
                    <th scope="col" className="py-3 px-4 text-start">{t("table.rating")}</th>
                    <th scope="col" className="py-3 px-4 text-end">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/40">
                  {filteredListings.map((listing) => {
                    const menuKey = `tbl-${listing.id}`;
                    const isMenuOpen = openCardMenuId === menuKey;
                    const isActive = listing.status === "active";
                    return (
                      <tr key={listing.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                              <Image
                                src={listing.imageSrc?.[0] || "/assets/hero.jpg"}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <Link
                                href={`/listings/${listing.id}`}
                                className={`block font-bold text-primary truncate max-w-[200px] hover:underline rounded ${FOCUS_RING}`}
                              >
                                {listing.title}
                              </Link>
                              <div className="text-[11px] text-neutral-600">
                                {t("location", { city: listing.city, country: listing.country })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-600">{categoryLabel(listing.category)}</td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(listing)}
                            title={isActive ? t("menu.pause") : t("menu.activate")}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${FOCUS_RING} ${
                              isActive ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"
                            }`}
                          >
                            {isActive ? t("status.active") : t("status.paused")}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">{money(listing.price)}</td>
                        <td className="py-3 px-4 text-neutral-600 font-semibold">
                          {t("table.stays", { count: listing.bookingsCount ?? 0 })}
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-700">
                          <span className="inline-flex items-center gap-1">
                            {formatRatingValue(listing.rating, locale) ? (
                              <>
                                <BrandStarIcon size={12} className="text-accent fill-accent" />
                                <span>{formatRatingValue(listing.rating, locale)}</span>
                              </>
                            ) : (
                              tListing("ratingNew")
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(listing)}
                              aria-haspopup="dialog"
                              aria-label={t("editListingAria", { title: listing.title })}
                              title={t("edit")}
                              className={`p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-700 ${FOCUS_RING}`}
                            >
                              <BrandEditIcon size={16} />
                            </button>
                            <Link
                              href="/host/calendar"
                              aria-label={t("calendarListingAria", { title: listing.title })}
                              title={t("calendar")}
                              className={`p-1.5 hover:bg-neutral-100 rounded-lg text-secondary ${FOCUS_RING}`}
                            >
                              <BrandCalendarIcon size={16} />
                            </Link>
                            <div className="relative">
                              <button
                                type="button"
                                id={menuTriggerId(menuKey)}
                                onClick={() => toggleMenu(menuKey)}
                                aria-haspopup="menu"
                                aria-expanded={isMenuOpen}
                                aria-controls={isMenuOpen ? menuId(menuKey) : undefined}
                                aria-label={t("moreActionsAria", { title: listing.title })}
                                title={t("moreActions")}
                                className={`p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 ${FOCUS_RING}`}
                              >
                                <BrandMoreIcon size={16} />
                              </button>
                              {isMenuOpen && (
                                <div
                                  id={menuId(menuKey)}
                                  role="menu"
                                  aria-labelledby={menuTriggerId(menuKey)}
                                  className="absolute end-0 top-8 w-44 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in"
                                >
                                  <Link
                                    href={`/listings/${listing.id}`}
                                    target="_blank"
                                    role="menuitem"
                                    onClick={() => setOpenCardMenuId(null)}
                                    className={menuItemClass}
                                  >
                                    <BrandEyeIcon size={14} className="text-secondary" />
                                    <span>{t("menu.viewPublic")}</span>
                                  </Link>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      handleToggleStatus(listing);
                                    }}
                                    className={menuItemClass}
                                  >
                                    <BrandFilterIcon size={14} className="text-secondary" />
                                    <span>{isActive ? t("menu.pause") : t("menu.activate")}</span>
                                  </button>
                                  <hr className="my-1 border-tertiary/30" role="separator" />
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      setDeletingId(listing.id);
                                    }}
                                    className={`${menuItemClass} hover:bg-rose-50 text-rose-700`}
                                  >
                                    <BrandTrashIcon size={14} />
                                    <span>{t("menu.delete")}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      {editingListing && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSaving) closeEdit();
          }}
        >
          <div
            ref={editDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ids.editTitle}
            className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/60 mb-4">
              <h2 id={ids.editTitle} className="font-serif text-lg font-black text-primary">
                {t("editModal.title")}
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                aria-label={t("editModal.close")}
                className={`w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm ${FOCUS_RING}`}
              >
                <BrandCloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor={ids.editTitleInput} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("editModal.titleLabel")}
                </label>
                <input
                  id={ids.editTitleInput}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  aria-invalid={editErrors.title || undefined}
                  aria-describedby={editErrors.title ? ids.editTitleError : undefined}
                  className={`w-full px-3 py-2 bg-neutral-50 border rounded-xl text-xs sm:text-sm text-primary ${INPUT_FOCUS} ${
                    editErrors.title ? "border-rose-600" : "border-tertiary/80"
                  }`}
                />
                {editErrors.title && (
                  <p id={ids.editTitleError} className="mt-1 text-[11px] font-semibold text-rose-700">
                    {t("editModal.titleError")}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={ids.editPrice} className="text-xs font-bold text-neutral-600 block mb-1">
                  {t("editModal.priceLabel")}
                </label>
                <div className="relative">
                  <input
                    id={ids.editPrice}
                    type="number"
                    inputMode="numeric"
                    min={PRICE_MIN_DZD}
                    max={PRICE_MAX_DZD}
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseInt(e.target.value, 10) || 0)}
                    aria-invalid={editErrors.price || undefined}
                    aria-describedby={
                      editErrors.price ? `${ids.editPriceSuffix} ${ids.editPriceError}` : ids.editPriceSuffix
                    }
                    className={`w-full ps-3 pe-14 py-2 bg-neutral-50 border rounded-xl text-xs sm:text-sm font-mono font-bold text-primary ${INPUT_FOCUS} ${
                      editErrors.price ? "border-rose-600" : "border-tertiary/80"
                    }`}
                  />
                  <span
                    id={ids.editPriceSuffix}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-600"
                  >
                    {t("editModal.currency")}
                  </span>
                </div>
                {editErrors.price && (
                  <p id={ids.editPriceError} className="mt-1 text-[11px] font-semibold text-rose-700">
                    {t("editModal.priceError", priceRange)}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-tertiary/60">
                <div>
                  <label htmlFor={ids.editInstant} className="block text-xs font-bold text-primary">
                    {t("editModal.instantBook")}
                  </label>
                  <span id={ids.editInstantHint} className="text-[11px] text-neutral-600">
                    {t("editModal.instantBookHint")}
                  </span>
                </div>
                <input
                  id={ids.editInstant}
                  type="checkbox"
                  checked={editInstantBook}
                  onChange={(e) => setEditInstantBook(e.target.checked)}
                  aria-describedby={ids.editInstantHint}
                  className="w-5 h-5 text-primary rounded focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                className={`px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition ${FOCUS_RING}`}
              >
                {t("editModal.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                aria-busy={isSaving}
                className={`px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs disabled:opacity-50 ${FOCUS_RING}`}
              >
                {isSaving ? t("editModal.saving") : t("editModal.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Room Types Modal (Section 2: Hotel & Hostel) */}
      {managingRoomTypesListing && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSavingRoomTypes) closeRoomTypes();
          }}
        >
          <div
            ref={roomTypesDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ids.roomTypesTitle}
            className="bg-white rounded-3xl max-w-xl w-full p-6 border border-tertiary shadow-xl space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-tertiary/60 pb-3">
              <div>
                <h2
                  id={ids.roomTypesTitle}
                  className="font-serif font-bold text-lg text-primary flex items-center gap-2"
                >
                  <BrandBedIcon size={22} className="text-secondary" />
                  <span>{t("roomTypesModal.title")}</span>
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {t("roomTypesModal.subtitle", {
                    title: managingRoomTypesListing.title,
                    kind:
                      managingRoomTypesListing.businessCategory === "hostel"
                        ? t("roomTypesModal.kindHostel")
                        : t("roomTypesModal.kindHotel"),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRoomTypes}
                disabled={isSavingRoomTypes}
                aria-label={t("roomTypesModal.close")}
                className={`p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition ${FOCUS_RING}`}
              >
                <BrandCloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {tempRoomTypes.map((rt, index) => {
                const priceId = `${baseId}-rt-price-${index}`;
                const inventoryId = `${baseId}-rt-inventory-${index}`;
                return (
                  <fieldset
                    key={rt.id || index}
                    className="p-4 rounded-2xl bg-neutral-50/70 border border-tertiary/80 space-y-3"
                  >
                    <legend className="sr-only">{rt.name}</legend>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-primary flex items-center gap-2">
                          <span>{rt.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary/15 text-secondary">
                            {rt.bookingUnit === "bed" ? t("roomTypesModal.perBed") : t("roomTypesModal.perRoom")}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600 mt-0.5">
                          {rt.bedsDescription || t("roomTypesModal.capacity", { count: rt.capacity })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label htmlFor={priceId} className="block text-[11px] font-bold text-neutral-600 mb-1">
                          {t("roomTypesModal.priceLabel")}
                        </label>
                        <input
                          id={priceId}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={rt.basePrice ?? rt.price}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setTempRoomTypes((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, basePrice: val, price: val } : item))
                            );
                          }}
                          className={`w-full px-3 py-1.5 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary ${INPUT_FOCUS}`}
                        />
                      </div>
                      <div>
                        <label htmlFor={inventoryId} className="block text-[11px] font-bold text-neutral-600 mb-1">
                          {rt.bookingUnit === "bed" ? t("roomTypesModal.inventoryBeds") : t("roomTypesModal.inventoryRooms")}
                        </label>
                        <input
                          id={inventoryId}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={rt.inventoryCount ?? rt.totalInventory}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setTempRoomTypes((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, inventoryCount: val, totalInventory: val } : item
                              )
                            );
                          }}
                          className={`w-full px-3 py-1.5 bg-white border border-tertiary/80 rounded-xl text-xs font-mono font-bold text-primary ${INPUT_FOCUS}`}
                        />
                      </div>
                    </div>
                  </fieldset>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-tertiary/50">
              <button
                type="button"
                onClick={closeRoomTypes}
                disabled={isSavingRoomTypes}
                className={`px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition ${FOCUS_RING}`}
              >
                {t("roomTypesModal.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveRoomTypes}
                disabled={isSavingRoomTypes}
                aria-busy={isSavingRoomTypes}
                className={`px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs disabled:opacity-50 ${FOCUS_RING}`}
              >
                {isSavingRoomTypes ? t("roomTypesModal.saving") : t("roomTypesModal.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        variant="destructive"
        title={t("deleteDialog.title")}
        message={t("deleteDialog.message")}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={t("deleteDialog.keep")}
        isLoading={isDeleting}
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
