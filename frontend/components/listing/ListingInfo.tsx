"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { formatRating } from "@/lib/i18n/date-locale";
import { summarizeReviews, type ReviewCategory } from "@/lib/reviews";
import { Listing, User, PublicUser, Review } from "@/types";
import { experienceTypeLabel } from "@/lib/catalog-types";
import Avatar from "@/components/Avatar";
import { Button, Dialog } from "@/components/ui";
import { GuestFavoriteIcon, BrandShieldIcon, BrandBedIcon, BrandPinIcon } from "@/components/icons";
import { amenityIcon } from "./detail/amenityIcons";
import { ExperienceDetails, VehicleDetails } from "./detail/CategoryDetails";
import ReviewsSummary from "./detail/ReviewsSummary";
import { Link, useRouter } from "@/navigation";
import type { HostProfileLink } from "@/lib/host-profile";
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
  hostProfile?: HostProfileLink | null;
  reviews?: Review[];
  similarListings?: Listing[];
  currentUser?: User | null;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const RATING_CATEGORIES: ReviewCategory[] = [
  "cleanliness",
  "accuracy",
  "communication",
  "location",
  "value",
];

export default function ListingInfo({
  listing,
  host,
  hostProfile,
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
          result.code === "HOST_UNREACHABLE" ||
            result.code === "OWN_LISTING_MESSAGE"
            ? errorText(result)
            : t("conversationFailed"),
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
  const hostName = hostProfile?.name || host?.name || t("hostFallback");

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
    t.has(`amenityLabels.${key}`)
      ? t(`amenityLabels.${key}`)
      : key.replace(/_/g, " ");

  const placeLabel = listing.city
    ? t("cityCountry", { city: listing.city })
    : t("algeria");
  const reviewSummary = summarizeReviews(reviews);
  const rating = formatRating(listing.rating || reviewSummary?.overall, locale);
  const reviewCount = listing.reviewCount ?? reviewSummary?.count ?? 0;
  // Only facts the listing actually has, no invented defaults.
  const specs: string[] = (
    isVehicle
      ? [
          listing.seats ? t("seatsCount", { count: listing.seats }) : null,
          listing.transmission
            ? t(
                `transmission.${listing.transmission === "manual" ? "manual" : "automatic"}`,
              )
            : null,
          listing.fuelType ? t(`fuel.${listing.fuelType}`) : null,
          listing.year ? t("modelYear", { year: String(listing.year) }) : null,
        ]
      : isExperience
        ? [
            experienceTypeLabel(listing.experienceType, locale) || null,
            listing.durationHours
              ? t("hoursCount", { count: listing.durationHours })
              : null,
            listing.groupSize
              ? t("upToGuests", { count: listing.groupSize })
              : null,
            t("guideIncluded"),
          ]
        : [
            listing.guestCount
              ? t("guestCount", { count: listing.guestCount })
              : null,
            listing.bedroomCount
              ? t("bedroomCount", { count: listing.bedroomCount })
              : null,
            listing.roomCount
              ? t("bedCount", { count: listing.roomCount })
              : null,
            listing.bathroomCount
              ? t("bathCount", { count: listing.bathroomCount })
              : null,
          ]
  ).filter((v): v is string => Boolean(v));
  const hostSinceYear = host?.createdAt
    ? new Date(host.createdAt).getFullYear()
    : null;

  return (
    <div className="text-primary-800">
      {/* 1. Host Summary Row */}
      <div
        data-reveal
        className="flex items-center justify-between gap-6 border-b border-primary/[0.08] pb-8"
      >
        <div>
          <h2 className="font-serif text-heading text-primary-900">
            {isVehicle
              ? t("vehicleHostedBy", {
                  vehicle: listing.make || t("vehicle"),
                  name: hostName,
                })
              : isExperience
                ? t("experienceLedBy", { name: hostName })
                : t("entireStayHostedBy", { name: hostName })}
          </h2>
          {specs.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-body text-primary-500 mt-2">
              {specs.map((spec, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span>{spec}</span>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>

        {hostProfile ? (
          <Link
            href={hostProfile.href}
            aria-label={t("viewHostProfile", { name: hostName })}
            className={`flex-shrink-0 rounded-full ${focusRing}`}
          >
            <Avatar src={hostProfile.image || host?.image || "/assets/avatar.png"} size={56} />
          </Link>
        ) : (
          <div className="flex-shrink-0">
            <Avatar src="/assets/avatar.png" size={56} />
          </div>
        )}
      </div>

      {/* 2. Key Highlights */}
      <div
        data-reveal
        className="space-y-6 border-b border-primary/[0.08] py-8"
      >
        {listing.isGuestFavorite && (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-e1 text-accent-600 flex items-center justify-center flex-shrink-0">
              <GuestFavoriteIcon size={24} />
            </div>
            <div>
              <h3 className="text-title font-semibold text-primary-900">
                {tNav("guestFavorite")}
              </h3>
              <p className="text-body text-primary-500 mt-0.5">
                {t("guestFavoriteDesc")}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-e1 text-secondary-700 flex items-center justify-center flex-shrink-0">
            <BrandShieldIcon size={24} strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-title font-semibold text-primary-900">
              {t("policyCancellation", { policy: policyLabel })}
            </h3>
            <p className="text-body text-primary-500 mt-0.5">{policySummary}</p>
          </div>
        </div>
      </div>

      {/* 3. Description Section */}
      <div
        data-reveal
        className="border-b border-primary/[0.08] py-10 space-y-4"
      >
        <h3 className="font-serif text-heading text-primary-900">
          {t(
            `about.${isVehicle ? "vehicle" : isExperience ? "experience" : "home"}`,
          )}
        </h3>
        <p
          id="listing-description"
          className={`text-body-lg text-primary-700 ${!isDescExpanded ? "line-clamp-4" : ""}`}
        >
          {listing.description}
        </p>
        <button
          type="button"
          aria-expanded={isDescExpanded}
          aria-controls="listing-description"
          onClick={() => setIsDescExpanded((prev) => !prev)}
          className={`text-sm font-semibold text-primary-900 underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition cursor-pointer rounded ${focusRing}`}
        >
          {isDescExpanded ? t("showLess") : t("showMore")}
        </button>
      </div>

      {/* 4. Sleeping Arrangements */}
      {!isVehicle && !isExperience && (
        <div
          data-reveal
          className="border-b border-primary/[0.08] py-10 space-y-5"
        >
          <h3 className="font-serif text-heading text-primary-900">
            {t("sleepingArrangements")}
          </h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: listing.bedroomCount || 2 }).map((_, idx) => (
              <li
                key={idx}
                className="p-5 rounded-2xl bg-white shadow-e1 space-y-3 transition-[box-shadow,transform] duration-base ease-out hover:shadow-e2 hover:-translate-y-0.5"
              >
                <BrandBedIcon
                  size={24}
                  strokeWidth={1.8}
                  className="text-primary"
                />
                <h4 className="font-semibold text-[0.9375rem] text-primary-900">
                  {t("bedroomNumber", { number: idx + 1 })}
                </h4>
                <p className="text-meta text-primary-500">
                  {t("bedroomDetails")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Amenities (homes) or category-specific blocks */}
      {isExperience ? (
        <ExperienceDetails listing={listing} />
      ) : isVehicle ? (
        <VehicleDetails listing={listing} pickupTime={rules.checkInTime} returnTime={rules.checkOutTime} />
      ) : (
        <div id="amenities" data-reveal className="scroll-mt-28 border-b border-primary/[0.08] py-10 space-y-5">
          <h3 className="font-serif text-heading text-primary-900">{t("amenitiesTitle")}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {allAmenities.slice(0, 8).map((amenityKey) => {
              const IconComp = amenityIcon(amenityKey);
              return (
                <li key={amenityKey} className="flex items-center gap-4 text-body text-primary-800">
                  <IconComp size={22} className="text-secondary-700 flex-shrink-0" />
                  <span className="first-letter:uppercase">{amenityLabel(amenityKey)}</span>
                </li>
              );
            })}
          </ul>
          {allAmenities.length > 8 && (
            <Button variant="tertiary" className="mt-4" aria-haspopup="dialog" onClick={() => setIsAmenitiesModalOpen(true)}>
              {t("showAllAmenities", { count: allAmenities.length })}
            </Button>
          )}
        </div>
      )}

      {/* 6. House rules (homes), times and cancellation policy */}
      <div data-reveal className="border-b border-primary/[0.08] py-10 space-y-5">
        <h3 className="font-serif text-heading text-primary-900">
          {isVehicle || isExperience ? t("timesAndCancellation") : t("rulesAndCancellation")}
        </h3>
        <div className={`grid grid-cols-1 gap-4 text-body ${isVehicle || isExperience ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <div>
            <h4 className="font-semibold text-primary-900 mb-1.5">
              {isVehicle ? t("pickupAndReturn") : isExperience ? t("startTime") : t("checkInCheckout")}
            </h4>
            {isExperience ? (
              <p className="text-primary-500">{t("startsAt", { time: rules.checkInTime })}</p>
            ) : (
              <>
                <p className="text-primary-500">
                  {isVehicle ? t("pickupFrom", { time: rules.checkInTime }) : t("checkInFrom", { time: rules.checkInTime })}
                </p>
                <p className="text-primary-500">
                  {isVehicle ? t("returnBefore", { time: rules.checkOutTime }) : t("checkoutBefore", { time: rules.checkOutTime })}
                </p>
              </>
            )}
            {!isExperience && rules.minNights > 1 && (
              <p className="text-primary-500">
                {isVehicle ? t("minimumDays", { count: rules.minNights }) : t("minimumStay", { count: rules.minNights })}
              </p>
            )}
          </div>
          {!isVehicle && !isExperience && (
            <div>
              <h4 className="font-semibold text-primary-900 mb-1.5">{t("duringStay")}</h4>
              <p className="text-primary-500">{t("noParties")}</p>
              <p className="text-primary-500">{t("noSmoking")}</p>
            </div>
          )}
          <div>
            <h4 className="font-semibold text-primary-900 mb-1.5">{t("cancellationPolicy")}</h4>
            <p className="text-primary-500">
              <span className="font-semibold">{policyLabel}.</span> {policySummary}
            </p>
          </div>
        </div>
      </div>

      {/* 7. Reviews */}
      <ReviewsSummary
        reviews={reviews}
        rating={rating}
        reviewCount={reviewCount}
        className="border-b border-primary/[0.08] py-10"
        metrics={
          reviewSummary
            ? RATING_CATEGORIES.filter((key) => reviewSummary.categories[key] > 0).map((key) => ({
                key,
                label: t(key),
                score: reviewSummary.categories[key],
              }))
            : []
        }
      />

      {/* 8. Location Map Section */}
      <div
        id="location"
        data-reveal
        className="scroll-mt-28 border-b border-primary/[0.08] py-10 space-y-5"
      >
        <h3 className="font-serif text-heading text-primary-900">
          {t("whereYoullBe")}
        </h3>
        <p className="text-body text-primary-500 flex items-center">
          <BrandPinIcon
            size={16}
            strokeWidth={1.8}
            className="inline-block me-1.5 shrink-0 text-accent"
          />
          <span>{t("locationNote", { place: placeLabel })}</span>
        </p>
        <div className="rounded-3xl overflow-hidden shadow-e2">
          <Map
            center={listing.latlng}
            isApproximate={true}
            className="h-[380px]"
          />
        </div>
      </div>

      {/* 9. Host Profile Card */}
      <div
        data-reveal
        className="border-b border-primary/[0.08] py-10 space-y-5"
      >
        <h3 className="font-serif text-heading text-primary-900">
          {t("hostCardTitle")}
        </h3>
        <div className="relative overflow-hidden p-7 rounded-3xl bg-white shadow-e2 flex flex-col sm:flex-row items-center gap-6">
          <div
            aria-hidden="true"
            className="absolute -top-12 -end-12 w-40 h-40 texture-zellige opacity-90"
          />
          <Avatar src={host?.image || "/assets/avatar.png"} size={72} />
          <div className="space-y-1 text-center sm:text-start flex-1">
            {hostProfile && (
              <p className="text-eyebrow uppercase font-semibold text-secondary-700">{t(`hostKind.${hostProfile.kind}`)}</p>
            )}
            <h4 className="font-serif text-[1.5rem] text-primary-900">
              {hostName}
            </h4>
            {hostSinceYear && (
              <p className="text-meta text-primary-500">
                {t("hostSince", { year: String(hostSinceYear) })}
              </p>
            )}
            {host?.bio && (
              <p className="text-body text-primary-600 pt-1">{host.bio}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleMessageHost}
            disabled={isContacting}
            aria-busy={isContacting || undefined}
            className={`relative disabled:opacity-60 h-11 px-6 rounded-full bg-primary-800 text-white font-semibold text-sm shadow-e2 hover:bg-primary-900 active:scale-[0.98] transition duration-fast ease-standard cursor-pointer flex-shrink-0 ${focusRing}`}
          >
            {t("messageHost")}
          </button>
          {hostProfile && (
            <Link
              href={hostProfile.href}
              className={`relative h-11 px-6 rounded-full bg-white text-primary-900 font-semibold text-sm shadow-e1 ring-1 ring-primary/10 hover:shadow-e2 transition duration-fast ease-standard flex items-center flex-shrink-0 ${focusRing}`}
            >
              {t("viewProfile")}
            </Link>
          )}
        </div>
      </div>

      {/* 10. Similar Listings Carousel */}
      {similarListings.length > 0 && (
        <div data-reveal className="space-y-6 py-10">
          <h3 className="font-serif text-heading text-primary-900">
            {t("similarListingsAlgeria")}
          </h3>
          <div className="flex gap-5 overflow-x-auto snap-x scrollbar-none py-2 -mx-4 px-4 scroll-px-4 lg:mx-0 lg:px-0 lg:scroll-px-0">
            {similarListings.map((sim) => (
              <div
                key={sim.id}
                className="snap-start shrink-0 w-[72vw] sm:w-60"
              >
                <ListingCarouselCard listing={sim} currentUser={currentUser} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities dialog */}
      <Dialog isOpen={isAmenitiesModalOpen} onClose={() => setIsAmenitiesModalOpen(false)} title={t("allAmenities")} showClose>
        <ul className="mt-4 divide-y divide-primary/[0.08]">
          {allAmenities.map((am) => {
            const IconComp = amenityIcon(am);
            return (
              <li key={am} className="py-3 flex items-center gap-3 text-body text-primary-800">
                <IconComp size={20} className="text-secondary-700 shrink-0" />
                <span className="first-letter:uppercase">{amenityLabel(am)}</span>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </div>
  );
}
