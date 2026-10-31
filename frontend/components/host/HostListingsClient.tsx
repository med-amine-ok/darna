"use client";

import { isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import React, { useState, useMemo, useId } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Listing, User } from "@/types";
import { updateMyListingAction, deleteMyListingAction } from "@/app/actions/listings";
import {
  BrandSearchIcon,
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
  BrandEyeOffIcon,
  BrandCheckCircleIcon,
  InstantBookingIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import { useLocale, useTranslations } from "next-intl";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import HostWalletWidget from "@/components/host/HostWalletWidget";
import { formatDzd } from "@/lib/currency";
import { formatNumber, formatRating as formatRatingValue } from "@/lib/i18n/date-locale";
import { useActionError } from "@/hook/useActionError";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogFooter,
  DropdownMenu,
  IconButton,
  Input,
  KitEmptyState,
  Select,
  SegmentedControl,
  Switch,
  cn,
  focusRing,
} from "@/components/ui";
import type { DropdownItem } from "@/components/ui";

interface HostListingsClientProps {
  initialListings: Listing[];
  currentUser?: User | null;
}

const LISTING_CATEGORIES = ["home", "hotel", "experience", "vehicle", "trip"];
const FALLBACK_LISTING_IMAGE = "https://images.unsplash.com/photo-1580587771525-78b9dba3b914";

type PriceUnit = "night" | "day" | "person" | "bed";

/** What the base price is charged per: homes and hotel rooms per night, hostels per bed, vehicles per day, experiences and trips per person. */
function priceUnit(listing: Listing): PriceUnit {
  if (listing.businessCategory === "hostel" || listing.roomTypes?.some((r) => r.bookingUnit === "bed")) return "bed";
  if (listing.category === "vehicle") return "day";
  if (listing.category === "experience" || listing.category === "trip") return "person";
  return "night";
}

function ListingPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className={cn(
        "object-cover transition-transform [transition-duration:700ms] ease-out group-hover:scale-[1.04]"
      )}
    />
  );
}

export default function HostListingsClient({ initialListings, currentUser }: HostListingsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("hostListings");
  const tListing = useTranslations("listing");
  const errorText = useActionError();
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
  const [editErrors, setEditErrors] = useState<{ title?: boolean; price?: boolean }>({});

  // Manage Room Types modal state (Section 2)
  const [managingRoomTypesListing, setManagingRoomTypesListing] = useState<Listing | null>(null);
  const [tempRoomTypes, setTempRoomTypes] = useState<NonNullable<Listing["roomTypes"]>>([]);
  const [isSavingRoomTypes, setIsSavingRoomTypes] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const baseId = useId();
  const resultsId = `${baseId}-results`;

  const closeEdit = () => {
    setEditingListing(null);
    setEditErrors({});
  };
  const closeRoomTypes = () => setManagingRoomTypesListing(null);

  const money = (amount: number) => formatDzd(amount, locale);
  const ratedListings = listings.filter((l) => l.rating && l.rating > 0);
  const ratingWeight = ratedListings.reduce((sum, l) => sum + (l.reviewCount || 1), 0);
  const averageRating = ratingWeight
    ? formatRatingValue(ratedListings.reduce((sum, l) => sum + (l.rating || 0) * (l.reviewCount || 1), 0) / ratingWeight, locale)
    : null;
  const categoryLabel = (category: string) =>
    LISTING_CATEGORIES.includes(category) ? t(`category.${category}`) : category;
  const kindOf = (listing: Listing) => (listing.businessCategory === "hostel" ? "hostel" : "other");
  const unitLabel = (listing: Listing) => t(`unit.${priceUnit(listing)}`);

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
      setListings((prev) => prev.map((l) => (l.id === managingRoomTypesListing.id ? result.data : l)));
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

  const openPublicPage = (listing: Listing) => {
    window.open(`/${locale}/listings/${listing.id}`, "_blank", "noopener,noreferrer");
  };

  const menuItems = (listing: Listing): DropdownItem[] => {
    const isActive = listing.status === "active";
    return [
      {
        label: t("edit"),
        icon: <BrandEditIcon size={16} aria-hidden="true" />,
        onSelect: () => handleOpenEdit(listing),
      },
      {
        label: isActive ? t("menu.pause") : t("menu.activate"),
        icon: isActive ? (
          <BrandEyeOffIcon size={16} aria-hidden="true" />
        ) : (
          <BrandCheckCircleIcon size={16} aria-hidden="true" />
        ),
        onSelect: () => handleToggleStatus(listing),
      },
      ...((listing.roomTypes?.length ?? 0) > 0
        ? [
            {
              label: t("menu.manageRoomTypes"),
              icon: <BrandBedIcon size={16} aria-hidden="true" />,
              onSelect: () => handleOpenManageRoomTypes(listing),
            } as DropdownItem,
          ]
        : []),
      {
        label: t("menu.viewPublic"),
        icon: <BrandEyeIcon size={16} aria-hidden="true" />,
        onSelect: () => openPublicPage(listing),
      },
      { type: "separator" },
      {
        label: t("menu.delete"),
        icon: <BrandTrashIcon size={16} aria-hidden="true" />,
        destructive: true,
        onSelect: () => setDeletingId(listing.id),
      },
    ];
  };

  const statusBadge = (listing: Listing, onPhoto = false) =>
    listing.status === "active" ? (
      <Badge tone="success" dot className={onPhoto ? "bg-white/90 shadow-e1 backdrop-blur-sm" : undefined}>
        {t("status.active")}
      </Badge>
    ) : (
      <Badge tone="warning" dot className={onPhoto ? "bg-white/90 text-primary-800 shadow-e1 backdrop-blur-sm" : undefined}>
        {t("status.pausedDraft")}
      </Badge>
    );

  const ratingNode = (listing: Listing) => {
    const rating = formatRatingValue(listing.rating, locale);
    return rating ? (
      <span className="flex shrink-0 items-center gap-1 pt-0.5 text-meta font-semibold text-primary-800 tabular-nums">
        <BrandStarIcon size={13} aria-hidden="true" className="text-accent-600" />
        {t("ratingWithCount", { rating, count: formatNumber(listing.reviewCount || 0, locale) })}
      </span>
    ) : (
      <span className="shrink-0 pt-0.5 text-meta font-semibold text-secondary-700">{tListing("ratingNew")}</span>
    );
  };

  const stats = [
    { label: isIndividual ? t("stats.totalListings") : t("stats.totalFleet"), value: formatNumber(listings.length, locale) },
    { label: t("stats.active"), value: formatNumber(activeCount, locale), dot: "bg-secondary-600" },
    { label: t("stats.draft"), value: formatNumber(draftCount, locale), dot: "bg-amber-600" },
    { label: t("stats.avgRating"), value: averageRating ?? tListing("ratingNew"), star: !!averageRating },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="enter-lift text-balance font-serif text-display-md text-primary-900">
            {isIndividual ? t("titleIndividual") : t("titleAgency")}
          </h1>
          <p className="enter-up mt-2 max-w-2xl text-pretty text-body text-primary-600" style={{ animationDelay: "60ms" }}>
            {isIndividual ? t("subtitleIndividual") : t("subtitleAgency")}
          </p>
        </div>
        <div className="enter-up flex flex-wrap items-center gap-2" style={{ animationDelay: "120ms" }}>
          {currentUser?.hostType === "agency" && (
            <Button
              href="/host/agency/trips/new"
              variant="tertiary"
              leadingIcon={<BrandPlusIcon size={18} aria-hidden="true" />}
            >
              {t("addTrip")}
            </Button>
          )}
          <Button href="/become-a-host/1" leadingIcon={<BrandPlusIcon size={18} aria-hidden="true" />}>
            {isIndividual ? t("addListing") : t("createListing")}
          </Button>
        </div>
      </header>

      {/* Summary strip */}
      <Card padding="none" className="mb-4 overflow-hidden">
        <dl className="grid grid-cols-2 gap-px bg-primary/[0.06] sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white px-5 py-4">
              <dt className="flex items-center gap-1.5 text-meta font-medium text-primary-600">
                {s.dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />}
                {s.label}
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-serif text-heading leading-tight text-primary-900 tabular-nums">
                {s.value}
                {s.star && <BrandStarIcon size={16} aria-hidden="true" className="text-accent-600" />}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Wallet: one slim row, details on demand */}
      <HostWalletWidget variant="compact" className="mb-8" />

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Input
            type="search"
            label={t("searchLabel")}
            hideLabel
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-controls={resultsId}
            prefix={<BrandSearchIcon size={18} aria-hidden="true" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select
            label={t("filters.categoryLabel")}
            hideLabel
            value={selectedVertical}
            onChange={(e) => setSelectedVertical(e.target.value)}
            aria-controls={resultsId}
            containerClassName="!w-[calc(50%-0.25rem)] sm:!w-48"
            options={[
              { value: "all", label: t("filters.allCategories") },
              { value: "home", label: t("filters.home") },
              { value: "experience", label: t("filters.experience") },
              { value: "vehicle", label: t("filters.vehicle") },
            ]}
          />
          <Select
            label={t("filters.statusLabel")}
            hideLabel
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-controls={resultsId}
            containerClassName="!w-[calc(50%-0.25rem)] sm:!w-48"
            options={[
              { value: "all", label: t("filters.allStatuses") },
              { value: "active", label: t("filters.activeOnly") },
              { value: "draft", label: t("filters.draft") },
            ]}
          />
          <SegmentedControl
            ariaLabel={t("viewModeLabel")}
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "grid", label: <span className="sr-only">{t("gridView")}</span>, icon: <BrandGridIcon size={18} aria-hidden="true" /> },
              { value: "table", label: <span className="sr-only">{t("tableView")}</span>, icon: <BrandListIcon size={18} aria-hidden="true" /> },
            ]}
          />
        </div>
      </div>

      {/* Listings */}
      <div id={resultsId} aria-live="polite">
        {filteredListings.length === 0 ? (
          <Card padding="lg">
            <KitEmptyState
              variant="search"
              title={t("emptyTitle")}
              description={t("emptyText")}
              action={<Button href="/become-a-host/1">{t("createListing")}</Button>}
            />
          </Card>
        ) : viewMode === "grid" ? (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => {
              const roomTypeCount = listing.roomTypes?.length ?? 0;
              return (
                <li
                  key={listing.id}
                  className="group relative flex flex-col"
                >
                  <div className="relative aspect-[20/19] w-full overflow-hidden rounded-2xl bg-tertiary-100 shadow-e1 transition-[box-shadow,transform] duration-base ease-out group-hover:-translate-y-1 group-hover:shadow-e3">
                    <Link href={`/listings/${listing.id}`} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
                      <ListingPhoto src={listing.imageSrc?.[0] || FALLBACK_LISTING_IMAGE} alt={t("imageAlt", { title: listing.title })} />
                    </Link>
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary-900/25 to-transparent" />
                    <div className="pointer-events-none absolute start-3 top-3">{statusBadge(listing, true)}</div>
                    <div className="absolute end-2 top-2">
                      <DropdownMenu
                        align="end"
                        ariaLabel={t("moreActionsAria", { title: listing.title })}
                        trigger={
                          <IconButton
                            variant="glass"
                            size="sm"
                            label={t("moreActionsAria", { title: listing.title })}
                            icon={<BrandMoreIcon size={18} aria-hidden="true" />}
                          />
                        }
                        items={menuItems(listing)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col pt-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="line-clamp-1 min-w-0 text-[0.9375rem] font-semibold leading-snug text-primary-900">
                        <Link href={`/listings/${listing.id}`} className={cn("rounded hover:underline", focusRing)}>
                          {listing.title}
                        </Link>
                      </h2>
                      {ratingNode(listing)}
                    </div>
                    <p className="mt-0.5 truncate text-meta text-primary-500">
                      {categoryLabel(listing.category)} · {t("location", { city: listing.city, country: listing.country })}
                    </p>
                    {roomTypeCount > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-meta text-primary-600">
                        <BrandBedIcon size={14} aria-hidden="true" className="text-secondary-700" />
                        {t("roomTypesCount", { kind: kindOf(listing), count: roomTypeCount })}
                        <span aria-hidden="true">·</span>
                        {t("inventoryTotal", {
                          kind: kindOf(listing),
                          count: (listing.roomTypes ?? []).reduce((acc, r) => acc + (r.inventoryCount ?? r.totalInventory ?? 0), 0),
                        })}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                      <span className="text-[0.9375rem] font-semibold text-primary-900 tabular-nums">{money(listing.price)}</span>
                      <span className="text-meta text-primary-500">{unitLabel(listing)}</span>
                      {listing.instantBook && (
                        <Badge tone="olive" icon={<InstantBookingIcon size={12} aria-hidden="true" />} className="ms-auto self-center">
                          {t("instantBook")}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="tertiary"
                        onClick={() => handleOpenEdit(listing)}
                        aria-haspopup="dialog"
                        title={t("editTitle")}
                        leadingIcon={<BrandEditIcon size={15} aria-hidden="true" />}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        href="/host/calendar"
                        title={t("calendarTitle")}
                        leadingIcon={<BrandCalendarIcon size={15} aria-hidden="true" />}
                      >
                        {t("calendar")}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-meta">
                <thead className="border-b border-primary/[0.08] text-primary-600">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.property")}</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.type")}</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.status")}</th>
                    <th scope="col" className="px-4 py-3 text-end font-semibold">{t("table.rate")}</th>
                    <th scope="col" className="px-4 py-3 text-end font-semibold">{t("table.bookings")}</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.rating")}</th>
                    <th scope="col" className="px-4 py-3 text-end font-semibold">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/[0.06]">
                  {filteredListings.map((listing) => {
                    const isActive = listing.status === "active";
                    return (
                      <tr key={listing.id} className="transition-colors duration-fast hover:bg-darnaBg/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-tertiary-100">
                              <Image src={listing.imageSrc?.[0] || FALLBACK_LISTING_IMAGE} alt="" fill sizes="48px" className="object-cover" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/listings/${listing.id}`}
                                className={cn("block max-w-[16rem] truncate rounded font-semibold text-primary-900 hover:underline", focusRing)}
                              >
                                {listing.title}
                              </Link>
                              <div className="text-primary-500">{t("location", { city: listing.city, country: listing.country })}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-primary-700">{categoryLabel(listing.category)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(listing)}
                            title={isActive ? t("menu.pause") : t("menu.activate")}
                            className={cn("rounded-md", focusRing)}
                          >
                            <Badge tone={isActive ? "success" : "warning"} dot>
                              {isActive ? t("status.active") : t("status.paused")}
                            </Badge>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-end tabular-nums">
                          <span className="font-semibold text-primary-900">{money(listing.price)}</span>{" "}
                          <span className="text-primary-500">{unitLabel(listing)}</span>
                        </td>
                        <td className="px-4 py-3 text-end text-primary-700 tabular-nums">
                          {t("table.stays", { count: listing.bookingsCount ?? 0 })}
                        </td>
                        <td className="px-4 py-3">{ratingNode(listing)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              size="sm"
                              label={t("editListingAria", { title: listing.title })}
                              icon={<BrandEditIcon size={16} aria-hidden="true" />}
                              onClick={() => handleOpenEdit(listing)}
                              aria-haspopup="dialog"
                            />
                            <Link
                              href="/host/calendar"
                              aria-label={t("calendarListingAria", { title: listing.title })}
                              title={t("calendar")}
                              className={cn(
                                "inline-flex h-11 w-11 items-center justify-center rounded-full text-primary-800 hover:bg-primary/[0.07]",
                                focusRing
                              )}
                            >
                              <BrandCalendarIcon size={16} aria-hidden="true" />
                            </Link>
                            <DropdownMenu
                              align="end"
                              ariaLabel={t("moreActionsAria", { title: listing.title })}
                              trigger={
                                <IconButton
                                  size="sm"
                                  label={t("moreActionsAria", { title: listing.title })}
                                  icon={<BrandMoreIcon size={16} aria-hidden="true" />}
                                />
                              }
                              items={menuItems(listing)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Quick edit */}
      <Dialog
        isOpen={!!editingListing}
        onClose={closeEdit}
        busy={isSaving}
        title={t("editModal.title")}
        description={editingListing?.title}
        showClose
      >
        <div className="space-y-4">
          <Input
            label={t("editModal.titleLabel")}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            error={editErrors.title ? t("editModal.titleError") : undefined}
          />
          <Input
            label={
              editingListing
                ? t("editModal.priceLabelUnit", { unit: unitLabel(editingListing) })
                : t("editModal.priceLabel")
            }
            type="number"
            inputMode="numeric"
            min={PRICE_MIN_DZD}
            max={PRICE_MAX_DZD}
            value={editPrice}
            onChange={(e) => setEditPrice(parseInt(e.target.value, 10) || 0)}
            suffix={t("editModal.currency")}
            className="tabular-nums"
            error={editErrors.price ? t("editModal.priceError", priceRange) : undefined}
          />
          <div className="rounded-2xl bg-darnaBg p-4">
            <Switch
              label={t("editModal.instantBook")}
              description={t("editModal.instantBookHint")}
              checked={editInstantBook}
              onCheckedChange={setEditInstantBook}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="tertiary" onClick={closeEdit} disabled={isSaving}>
            {t("editModal.cancel")}
          </Button>
          <Button onClick={handleSaveEdit} loading={isSaving}>
            {t("editModal.save")}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Room types (hotels and hostels) */}
      <Dialog
        isOpen={!!managingRoomTypesListing}
        onClose={closeRoomTypes}
        busy={isSavingRoomTypes}
        size="lg"
        showClose
        title={t("roomTypesModal.title")}
        description={
          managingRoomTypesListing
            ? t("roomTypesModal.subtitle", {
                title: managingRoomTypesListing.title,
                kind:
                  managingRoomTypesListing.businessCategory === "hostel"
                    ? t("roomTypesModal.kindHostel")
                    : t("roomTypesModal.kindHotel"),
              })
            : undefined
        }
      >
        <div className="space-y-3">
          {tempRoomTypes.map((rt, index) => (
            <fieldset key={rt.id || index} className="space-y-3 rounded-2xl bg-darnaBg p-4">
              <legend className="sr-only">{rt.name}</legend>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body font-semibold text-primary-900">{rt.name}</span>
                <Badge tone="olive">{rt.bookingUnit === "bed" ? t("roomTypesModal.perBed") : t("roomTypesModal.perRoom")}</Badge>
              </div>
              <p className="text-meta text-primary-600">
                {rt.bedsDescription || t("roomTypesModal.capacity", { count: rt.capacity })}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={t("roomTypesModal.priceLabel")}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={rt.basePrice ?? rt.price}
                  suffix={t("editModal.currency")}
                  className="tabular-nums"
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setTempRoomTypes((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, basePrice: val, price: val } : item))
                    );
                  }}
                />
                <Input
                  label={rt.bookingUnit === "bed" ? t("roomTypesModal.inventoryBeds") : t("roomTypesModal.inventoryRooms")}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={rt.inventoryCount ?? rt.totalInventory}
                  className="tabular-nums"
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setTempRoomTypes((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, inventoryCount: val, totalInventory: val } : item))
                    );
                  }}
                />
              </div>
            </fieldset>
          ))}
        </div>
        <DialogFooter>
          <Button variant="tertiary" onClick={closeRoomTypes} disabled={isSavingRoomTypes}>
            {t("roomTypesModal.cancel")}
          </Button>
          <Button onClick={handleSaveRoomTypes} loading={isSavingRoomTypes}>
            {t("roomTypesModal.save")}
          </Button>
        </DialogFooter>
      </Dialog>

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
