"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, formatNumber, formatRating } from "@/lib/i18n/date-locale";
import { summarizeReviews, type ReviewCategory } from "@/lib/reviews";
import { Listing, User, PublicUser, Review } from "@/types";
import Avatar from "@/components/Avatar";
import Dialog from "@/components/ui/Dialog";
import {
  BrandStarIcon,
  GuestFavoriteIcon,
  BrandDoorIcon,
  BrandShieldIcon,
  BrandBedIcon,
  BrandCloseIcon,
  BrandPinIcon,
  CategoryPoolIcon,
  CategoryVehicleIcon,
  BrandWifiIcon,
  BrandSnowIcon,
  BrandKitchenIcon,
  BrandFlameIcon,
  BrandWaterIcon,
  type IconProps,
} from "@/components/icons";
import { Link, useRouter } from "@/navigation";
import { toast } from "react-toastify";
import { startConversationAction } from "@/app/actions/messages";
import { useLoginModal } from "@/hook/useLoginModal";
import { useActionError } from "@/hook/useActionError";
import { getCancellationPolicy } from "@/lib/booking/cancellation";
import { getStayRules } from "@/lib/booking/config";
import ListingCarouselCard from "@/components/home/ListingCarouselCard";

function MapLoading() {
  const t = useTranslations("listing");
  return (
    <div
      role="status"
      className="w-full h-[35vh] min-h-[300px] bg-tertiary/20 animate-pulse rounded-2xl flex items-center justify-center text-primary/70 text-sm"
    >
      {t("loadingMap")}
    </div>
  );
}

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

interface ListingInfoProps {
  listing: Listing;
  host?: PublicUser | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
}

const AMENITY_ICONS: Record<string, React.FC<IconProps>> = {
  wifi: BrandWifiIcon,
  pool: CategoryPoolIcon,
  kitchen: BrandKitchenIcon,
  parking: CategoryVehicleIcon,
  air_conditioning: BrandSnowIcon,
  sea_view: BrandWaterIcon,
  fireplace: BrandFlameIcon,
  courtyard: BrandDoorIcon,
  heating: BrandFlameIcon,
  mountain_view: BrandWaterIcon,
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const RATING_CATEGORIES: ReviewCategory[] = ["cleanliness", "accuracy", "communication", "location", "value"];

export default function ListingInfo({
  listing,
  host,
  reviews = [],
  similarListings = [],
  currentUser,
}: ListingInfoProps) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const errorText = useActionError();
  const router = useRouter();
  const openLogin = useLoginModal((s) => s.onOpen);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);
  const policy = getCancellationPolicy(listing.cancellationPolicy);
  const rules = getStayRules(listing);
  const policyLabel = t(`policies.${policy.id}.label`);
  const policySummary = t(`policies.${policy.id}.summary`);

  // Opens the existing thread with this host or starts one (server action).
  const handleMessageHost = async () => {
    if (!currentUser) {
      openLogin();
      return;
    }
    setIsContacting(true);
    try {
      const result = await startConversationAction({ listingId: listing.id });
      if (!result.ok) {
        if (result.code === "UNAUTHENTICATED") openLogin();
        toast.error(
          result.code === "HOST_UNREACHABLE" || result.code === "OWN_LISTING_MESSAGE"
            ? errorText(result)
            : t("conversationFailed")
        );
        return;
      }
      router.push(`/messages/${result.data.conversationId}`);
    } catch {
      toast.error(t("conversationFailed"));
    } finally {
      setIsContacting(false);
    }
  };

  const isVehicle = listing.category === "vehicle";
  const isExperience = listing.category === "experience";
  const hostName = host?.name || t("hostFallback");

  const allAmenities = listing.amenities || [
    "wifi",
    "pool",
    "kitchen",
    "parking",
    "air_conditioning",
    "sea_view",
    "fireplace",
    "courtyard",
  ];

  const amenityLabel = (key: string) =>
    t.has(`amenityLabels.${key}`) ? t(`amenityLabels.${key}`) : key.replace(/_/g, " ");

  const placeLabel = listing.city ? t("cityCountry", { city: listing.city }) : t("algeria");
  const reviewSummary = summarizeReviews(reviews);
  const rating = formatRating(listing.rating || reviewSummary?.overall, locale);
  const reviewCount = listing.reviewCount ?? reviewSummary?.count ?? 0;
  // Only facts the listing actually has — no invented defaults.
  const specs: string[] = (
    isVehicle
      ? [
          listing.seats ? t("seatsCount", { count: listing.seats }) : null,
          listing.transmission ? t(`transmission.${listing.transmission === "manual" ? "manual" : "automatic"}`) : null,
          listing.fuelType ? t(`fuel.${listing.fuelType}`) : null,
          listing.year ? t("modelYear", { year: String(listing.year) }) : null,
        ]
      : isExperience
      ? [
          listing.durationHours ? t("hoursCount", { count: listing.durationHours }) : null,
          listing.groupSize ? t("upToGuests", { count: listing.groupSize }) : null,
          t("guideIncluded"),
        ]
      : [
          listing.guestCount ? t("guestCount", { count: listing.guestCount }) : null,
          listing.bedroomCount ? t("bedroomCount", { count: listing.bedroomCount }) : null,
          listing.roomCount ? t("bedCount", { count: listing.roomCount }) : null,
          listing.bathroomCount ? t("bathCount", { count: listing.bathroomCount }) : null,
        ]
  ).filter((v): v is string => Boolean(v));
  const hostSinceYear = host?.createdAt ? new Date(host.createdAt).getFullYear() : null;

  return (
    <div className="space-y-8 text-primary">
      {/* 1. Host Summary Row */}
      <div className="flex items-center justify-between border-b border-tertiary/50 pb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isVehicle
              ? t("vehicleHostedBy", { vehicle: listing.make || t("vehicle"), name: hostName })
              : isExperience
              ? t("experienceLedBy", { name: hostName })
              : t("entireStayHostedBy", { name: hostName })}
          </h2>
          {specs.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-600 mt-1">
              {specs.map((spec, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span>{spec}</span>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>

        {host?.id ? (
          <Link
            href={`/users/${host.id}`}
            aria-label={t("viewHostProfile", { name: hostName })}
            className={`flex-shrink-0 rounded-full ${focusRing}`}
          >
            <Avatar src={host.image || "/assets/avatar.png"} size={56} />
          </Link>
        ) : (
          <div className="flex-shrink-0">
            <Avatar src="/assets/avatar.png" size={56} />
          </div>
        )}
      </div>

      {/* 2. Key Highlights */}
      <div className="space-y-4 border-b border-tertiary/50 pb-6">
        {listing.isGuestFavorite && (
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-tertiary/30 text-accent flex-shrink-0">
              <GuestFavoriteIcon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">{tNav("guestFavorite")}</h3>
              <p className="text-xs sm:text-sm text-neutral-600">{t("guestFavoriteDesc")}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-tertiary/30 text-primary flex-shrink-0">
            <BrandShieldIcon size={24} strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">{t("policyCancellation", { policy: policyLabel })}</h3>
            <p className="text-xs sm:text-sm text-neutral-600">{policySummary}</p>
          </div>
        </div>
      </div>

      {/* 3. Description Section */}
      <div className="border-b border-tertiary/50 pb-6 space-y-3">
        <h3 className="text-lg sm:text-xl font-bold">{t(`about.${isVehicle ? "vehicle" : isExperience ? "experience" : "home"}`)}</h3>
        <p
          id="listing-description"
          className={`text-sm sm:text-base text-neutral-700 leading-relaxed ${!isDescExpanded ? "line-clamp-4" : ""}`}
        >
          {listing.description}
        </p>
        <button
          type="button"
          aria-expanded={isDescExpanded}
          aria-controls="listing-description"
          onClick={() => setIsDescExpanded((prev) => !prev)}
          className={`text-xs sm:text-sm font-bold text-primary underline hover:text-accent-700 transition cursor-pointer rounded ${focusRing}`}
        >
          {isDescExpanded ? t("showLess") : t("showMore")}
        </button>
      </div>

      {/* 4. Sleeping Arrangements */}
      {!isVehicle && !isExperience && (
        <div className="border-b border-tertiary/50 pb-6 space-y-4">
          <h3 className="text-lg sm:text-xl font-bold">{t("sleepingArrangements")}</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: listing.bedroomCount || 2 }).map((_, idx) => (
              <li key={idx} className="p-4 rounded-2xl border border-tertiary/70 space-y-2 bg-white">
                <BrandBedIcon size={24} strokeWidth={1.8} className="text-primary" />
                <h4 className="font-bold text-sm">{t("bedroomNumber", { number: idx + 1 })}</h4>
                <p className="text-xs text-neutral-600">{t("bedroomDetails")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Amenities */}
      <div className="border-b border-tertiary/50 pb-6 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">
          {isVehicle ? t("vehicleFeatures") : isExperience ? t("whatsIncluded") : t("amenitiesTitle")}
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {allAmenities.slice(0, 8).map((amenityKey) => {
            const IconComp = AMENITY_ICONS[amenityKey] || BrandShieldIcon;
            return (
              <li key={amenityKey} className="flex items-center gap-3 text-sm text-neutral-800">
                <IconComp size={22} className="text-primary flex-shrink-0" />
                <span className="first-letter:uppercase">{amenityLabel(amenityKey)}</span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setIsAmenitiesModalOpen(true)}
          className={`mt-3 px-5 py-2.5 rounded-xl border border-primary font-bold text-xs sm:text-sm text-primary hover:bg-neutral-100 transition cursor-pointer ${focusRing}`}
        >
          {t("showAllAmenities", { count: allAmenities.length })}
        </button>
      </div>

      {/* 6. House Rules & Cancellation Policy */}
      <div className="border-b border-tertiary/50 pb-6 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">{t("rulesAndCancellation")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div>
            <h4 className="font-bold text-primary mb-1">{t("checkInCheckout")}</h4>
            <p className="text-neutral-600">{t("checkInFrom", { time: rules.checkInTime })}</p>
            <p className="text-neutral-600">{t("checkoutBefore", { time: rules.checkOutTime })}</p>
            {rules.minNights > 1 && (
              <p className="text-neutral-600">{t("minimumStay", { count: rules.minNights })}</p>
            )}
          </div>
          <div>
            <h4 className="font-bold text-primary mb-1">{t("duringStay")}</h4>
            <p className="text-neutral-600">{t("noParties")}</p>
            <p className="text-neutral-600">{t("noSmoking")}</p>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-1">{t("cancellationPolicy")}</h4>
            <p className="text-neutral-600">
              <span className="font-semibold">{policyLabel}.</span> {policySummary}
            </p>
          </div>
        </div>
      </div>

      {/* 7. Reviews Section */}
      <section id="reviews" aria-labelledby="reviews-heading" className="border-b border-tertiary/50 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <BrandStarIcon size={26} className="text-accent" />
          <h3 id="reviews-heading" className="text-xl sm:text-2xl font-bold">
            {rating ? t("ratingAndReviews", { rating, count: reviewCount }) : t("reviews")}
          </h3>
        </div>

        {/* Rating category breakdown (averages of the real reviews) */}
        {reviewSummary ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-xs sm:text-sm">
            {RATING_CATEGORIES.filter((key) => reviewSummary.categories[key] > 0).map((key) => {
              const score = reviewSummary.categories[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <dt>{t(key)}</dt>
                    <dd>{formatNumber(score, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</dd>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(score / 5) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="text-xs sm:text-sm text-neutral-600">{t("noReviewsYet")}</p>
        )}

        {/* Individual Review Cards */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
          {reviews.map((rev) => (
            <li key={rev.id} className="p-4 rounded-2xl border border-tertiary/60 bg-white space-y-2">
              <div className="flex items-center gap-3">
                <Avatar src={rev.user?.image || "/assets/avatar.png"} size={40} />
                <div>
                  <h4 className="font-bold text-sm text-primary">{rev.user?.name || t("guestFallback")}</h4>
                  {rev.createdAt && (
                    <p className="text-[11px] text-neutral-600">
                      {formatDate(rev.createdAt, locale, { month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">{rev.comment}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Location Map Section */}
      <div className="border-b border-tertiary/50 pb-8 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">{t("whereYoullBe")}</h3>
        <p className="text-xs sm:text-sm text-neutral-600 flex items-center">
          <BrandPinIcon size={16} strokeWidth={1.8} className="inline-block me-1.5 shrink-0 text-accent" />
          <span>{t("locationNote", { place: placeLabel })}</span>
        </p>
        <Map center={listing.latlng} isApproximate={true} className="h-[380px]" />
      </div>

      {/* 9. Host Profile Card */}
      <div className="border-b border-tertiary/50 pb-8 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold">{t("hostCardTitle")}</h3>
        <div className="p-6 rounded-3xl border border-tertiary/70 bg-white flex flex-col sm:flex-row items-center gap-6">
          <Avatar src={host?.image || "/assets/avatar.png"} size={72} />
          <div className="space-y-1 text-center sm:text-start flex-1">
            <h4 className="font-bold text-lg text-primary">{hostName}</h4>
            {hostSinceYear && (
              <p className="text-xs text-neutral-600">{t("hostSince", { year: String(hostSinceYear) })}</p>
            )}
            {host?.bio && <p className="text-xs sm:text-sm text-neutral-700 pt-1">{host.bio}</p>}
          </div>
          <button
            type="button"
            onClick={handleMessageHost}
            disabled={isContacting}
            aria-busy={isContacting || undefined}
            className={`disabled:opacity-60 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:opacity-90 transition cursor-pointer flex-shrink-0 ${focusRing}`}
          >
            {t("messageHost")}
          </button>
        </div>
      </div>

      {/* 10. Similar Listings Carousel */}
      {similarListings.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="text-lg sm:text-xl font-bold">{t("similarListingsAlgeria")}</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {similarListings.map((sim) => (
              <ListingCarouselCard key={sim.id} listing={sim} currentUser={currentUser} />
            ))}
          </div>
        </div>
      )}

      {/* Amenities Dialog */}
      <Dialog
        isOpen={isAmenitiesModalOpen}
        onClose={() => setIsAmenitiesModalOpen(false)}
        ariaLabel={t("allAmenities")}
        className="relative bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        backdropClassName="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <h3 className="font-bold text-lg text-primary">{t("allAmenities")}</h3>
          <button
            type="button"
            aria-label={t("closeAmenities")}
            onClick={() => setIsAmenitiesModalOpen(false)}
            className={`p-1 rounded-full hover:bg-neutral-100 ${focusRing}`}
          >
            <BrandCloseIcon size={20} strokeWidth={2} />
          </button>
        </div>
        <ul className="space-y-3 divide-y divide-neutral-100">
          {allAmenities.map((am) => (
            <li key={am} className="pt-2 flex items-center gap-3 text-sm text-neutral-800">
              <BrandShieldIcon size={18} strokeWidth={1.8} className="text-accent" />
              <span className="first-letter:uppercase">{amenityLabel(am)}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
