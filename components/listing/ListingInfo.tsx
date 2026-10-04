"use client";

import useCountries from "@/hook/useCountries";
import {
  SafeUser,
  ListingHighlight,
  SleepingArrangement,
  HouseRules,
  RatingBreakdown,
  HostInfo,
} from "@/types";
import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useState, useMemo } from "react";
import { IconType } from "react-icons";
import { useTranslations } from "next-intl";
import {
  MdStar,
  MdOutlineVpnKey,
  MdOutlineLocationOn,
  MdOutlineCalendarToday,
  MdOutlineWifi,
  MdOutlineKitchen,
  MdOutlineLocalLaundryService,
  MdOutlineDirectionsCar,
  MdOutlineAcUnit,
  MdOutlineWorkOutline,
  MdOutlinePool,
  MdOutlineHotTub,
  MdOutlineTv,
  MdOutlineDeck,
  MdClose,
  MdOutlineSecurity,
  MdOutlineSmokeFree,
  MdOutlinePets,
  MdOutlineAccessTime,
} from "react-icons/md";
import { IoBedOutline, IoClose } from "react-icons/io5";
import { BiBed } from "react-icons/bi";
import { toast } from "react-toastify";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";

const Map = dynamic(() => import("../Map"), {
  ssr: false,
});

type Props = {
  user: SafeUser;
  description: string;
  guestCount: number;
  roomCount: number;
  bathroomCount: number;
  category:
    | {
        icon: IconType;
        label: string;
        description: string;
      }
    | undefined;
  locationValue: string;
  coordinates?: [number, number];
  highlights?: ListingHighlight[];
  amenities?: string[];
  sleepingArrangements?: SleepingArrangement[];
  houseRules?: HouseRules;
  ratingBreakdown?: RatingBreakdown;
  hostInfo?: HostInfo;
  cancellationPolicy?: "flexible" | "moderate" | "strict";
  rating?: number;
  reviewCount?: number;
  isSuperhost?: boolean;
  isGuestFavorite?: boolean;
};

// Amenity icon mapping
const amenityIcons: Record<string, IconType> = {
  Wifi: MdOutlineWifi,
  Kitchen: MdOutlineKitchen,
  Washer: MdOutlineLocalLaundryService,
  "Free parking": MdOutlineDirectionsCar,
  "Air conditioning": MdOutlineAcUnit,
  "Dedicated workspace": MdOutlineWorkOutline,
  Pool: MdOutlinePool,
  "Hot tub": MdOutlineHotTub,
  TV: MdOutlineTv,
  Patio: MdOutlineDeck,
  "4x4 / AWD": MdOutlineDirectionsCar,
  "Heavy Duty 4WD": MdOutlineDirectionsCar,
  "GPS Navigation": MdOutlineLocationOn,
  "Bluetooth & USB": MdOutlineWifi,
  "Bluetooth Audio": MdOutlineWifi,
  "Bluetooth": MdOutlineWifi,
  "Unlimited Saharan KM": MdOutlineDirectionsCar,
  "Sand Recovery Gear": MdOutlineDirectionsCar,
  "Spare Wheel Kit": MdOutlineDirectionsCar,
  "Extra Spare Tire": MdOutlineDirectionsCar,
  "Leather Seats": IoBedOutline,
  Sunroof: MdOutlineDeck,
  "Panoramic Sunroof": MdOutlineDeck,
  "Full Insurance": MdOutlineSecurity,
  "Chauffeur Available": MdOutlineDirectionsCar,
  "Apple CarPlay & Android Auto": MdOutlineWifi,
  "Apple CarPlay": MdOutlineWifi,
  AWD: MdOutlineDirectionsCar,
  "Cruise Control": MdOutlineAccessTime,
  "Rear Camera": MdOutlineSecurity,
  "Child Seat Available": MdOutlinePets,
  "Tow Hitch": MdOutlineDirectionsCar,
  "Tow Bar": MdOutlineDirectionsCar,
  "Digital Cockpit": MdOutlineWorkOutline,
  "Parking Sensors": MdOutlineSecurity,
  "Eco Mode": MdOutlineAcUnit,
  "High-output A/C": MdOutlineAcUnit,
  "Roof Rails": MdOutlineDirectionsCar,
  "Touchscreen Navigation": MdOutlineLocationOn,
  "USB-C Ports": MdOutlineWifi,
  "Isofix Child Anchors": MdOutlineSecurity,
  "Snorkel & Winch": MdOutlineDirectionsCar,
  "Dual Fuel Tank": MdOutlineDirectionsCar,
  "Satellite GPS Tracker": MdOutlineLocationOn,
};

export default function ListingInfo({
  user,
  description,
  guestCount,
  roomCount,
  bathroomCount,
  category,
  locationValue,
  coordinates,
  highlights,
  amenities = [],
  sleepingArrangements,
  houseRules,
  ratingBreakdown,
  hostInfo,
  cancellationPolicy = "flexible",
  rating = 4.92,
  reviewCount = 28,
  isSuperhost = true,
  isGuestFavorite = true,
}: Props) {
  const { getByValue } = useCountries();
  const t = useTranslations("listing");
  const tCat = useTranslations("categories");
  const tCommon = useTranslations("common");

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

  const countryCoords = getByValue(locationValue)?.latlng;
  const mapCenter = coordinates || countryCoords;

  let catLabel = category?.label || "";
  let catDesc = category?.description || "";
  if (category?.label) {
    try {
      catLabel = tCat(category.label as any);
      catDesc = tCat(`${category.label}Desc` as any);
    } catch {
      catLabel = category.label;
      catDesc = category.description;
    }
  }

  // Default highlights fallback
  const resolvedHighlights: ListingHighlight[] = useMemo(() => {
    if (highlights && highlights.length > 0) return highlights;
    return [
      {
        icon: "key",
        title: t("selfCheckIn"),
        subtitle: t("selfCheckInDesc"),
      },
      {
        icon: "location",
        title: t("greatLocation"),
        subtitle: t("greatLocationDesc"),
      },
      {
        icon: "cancel",
        title: t("freeCancelHighlight"),
        subtitle: t("freeCancelHighlightDesc"),
      },
    ];
  }, [highlights, t]);

  // Default amenities fallback (ensure 10 items)
  const fullAmenitiesList = useMemo(() => {
    const defaults = [
      "Wifi",
      "Kitchen",
      "Washer",
      "Free parking",
      "Air conditioning",
      "Dedicated workspace",
      "Pool",
      "Hot tub",
      "TV",
      "Patio",
    ];
    if (amenities.length >= 10) return amenities;
    const combined = Array.from(new Set([...amenities, ...defaults]));
    return combined;
  }, [amenities]);

  // Default sleeping arrangements
  const resolvedBeds: SleepingArrangement[] = useMemo(() => {
    if (sleepingArrangements && sleepingArrangements.length > 0) return sleepingArrangements;
    return [
      { room: "Bedroom 1", bed: "1 king bed" },
      { room: "Bedroom 2", bed: "1 queen bed" },
      { room: "Living room", bed: "1 sofa bed" },
    ];
  }, [sleepingArrangements]);

  // Default rating breakdown
  const resolvedBreakdown: RatingBreakdown = useMemo(() => {
    return (
      ratingBreakdown || {
        cleanliness: 4.9,
        accuracy: 4.9,
        communication: 5.0,
        location: 4.8,
        checkIn: 5.0,
        value: 4.8,
      }
    );
  }, [ratingBreakdown]);

  // Sample guest reviews
  const mockReviews = [
    {
      id: "r1",
      author: "Sarah",
      date: "May 2026",
      comment:
        "The place was immaculate and exceeded all expectations! The location is quiet yet convenient, and the host was incredibly responsive.",
      rating: 5,
    },
    {
      id: "r2",
      author: "Alexandre",
      date: "April 2026",
      comment:
        "Outstanding design and amenities. The pool and outdoor area were breathtaking. Highly recommend for a relaxing stay!",
      rating: 5,
    },
    {
      id: "r3",
      author: "Fatima",
      date: "March 2026",
      comment:
        "Self check-in was seamless. Everything is modern, clean, and exactly as pictured. Would definitely book again.",
      rating: 5,
    },
    {
      id: "r4",
      author: "David",
      date: "February 2026",
      comment:
        "Wonderful hospitality! The attention to detail in the property made our trip unforgettable. 10/10 stay.",
      rating: 5,
    },
  ];

  return (
    <div className="flex flex-col gap-8 divide-y divide-neutral-200">
      {/* 1. Header Block: Host Summary & Basic Counts */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">
            {t("hostedBy", { name: user?.name || "Host" })}
          </h2>
          <div className="flex items-center gap-2 font-normal text-neutral-500 text-sm">
            <span>{category?.label === "Vehicles" ? `${guestCount} seats` : t("guestCount", { count: guestCount })}</span>
            <span>·</span>
            <span>{category?.label === "Vehicles" ? `${roomCount} doors / bags` : t("roomCount", { count: roomCount })}</span>
            <span>·</span>
            <span>{category?.label === "Vehicles" ? "Full Insurance" : t("bathroomCount", { count: bathroomCount })}</span>
          </div>
          {(isSuperhost || isGuestFavorite) && (
            <div className="flex items-center gap-2 mt-2">
              {isGuestFavorite && (
                <span className="bg-neutral-100 text-neutral-900 text-xs font-bold px-2.5 py-1 rounded-full border border-neutral-200">
                  {t("guestFavorite")}
                </span>
              )}
              {isSuperhost && (
                <span className="bg-neutral-100 text-neutral-900 text-xs font-bold px-2.5 py-1 rounded-full border border-neutral-200">
                  {t("superhost")}
                </span>
              )}
            </div>
          )}
        </div>
        <Avatar src={user?.image} userName={user?.name} />
      </div>

      {/* 2. Section 1: Highlights */}
      <div className="pt-8 flex flex-col gap-5">
        {resolvedHighlights.map((hl, idx) => (
          <div key={idx} className="flex items-start gap-4">
            <div className="text-neutral-800 pt-0.5 flex-shrink-0">
              {hl.icon === "location" ? (
                <Image
                  src="/assets/location.png"
                  alt="Location"
                  width={22}
                  height={30}
                  className="object-contain"
                />
              ) : hl.icon === "car" ? (
                <Image
                  src="/assets/car.png"
                  alt="Vehicle"
                  width={26}
                  height={26}
                  className="w-[26px] h-[26px] object-contain"
                />
              ) : hl.icon === "cancel" || hl.icon === "calendar" ? (
                <MdOutlineCalendarToday size={22} />
              ) : (
                <MdOutlineVpnKey size={22} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-neutral-900 text-base">{hl.title}</span>
              <span className="text-sm text-neutral-500">{hl.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category info if available */}
      {category && (
        <div className="pt-8">
          <ListingCategory icon={category.icon} label={catLabel} description={catDesc} />
        </div>
      )}

      {/* 3. Section 2: Description Expander */}
      <div className="pt-8 flex flex-col gap-3">
        <p
          className={`text-neutral-700 leading-relaxed text-base transition-all ${
            isDescriptionExpanded ? "" : "line-clamp-4"
          }`}
        >
          {description}
        </p>
        <button
          type="button"
          onClick={() => setIsDescriptionExpanded((prev) => !prev)}
          className="font-semibold text-neutral-900 underline text-sm hover:text-black self-start cursor-pointer"
        >
          {isDescriptionExpanded ? t("showLess") : `${t("showMore")} >`}
        </button>
      </div>

      {/* 4. Section 3: Amenities (10-grid + Modal) */}
      <div className="pt-8 flex flex-col gap-6">
        <h3 className="text-xl font-bold text-neutral-900">{t("amenitiesTitle")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fullAmenitiesList.slice(0, 10).map((amenity, idx) => {
            const IconComp = amenityIcons[amenity] || MdOutlineDeck;
            return (
              <div key={idx} className="flex items-center gap-3.5 text-neutral-800">
                <IconComp size={22} className="text-neutral-700 flex-shrink-0" />
                <span className="text-sm sm:text-base font-normal">{amenity}</span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsAmenitiesModalOpen(true)}
          className="self-start py-3 px-6 rounded-xl border border-neutral-900 font-semibold text-neutral-900 hover:bg-neutral-50 text-sm transition cursor-pointer mt-2"
        >
          {t("showAllAmenities", { count: fullAmenitiesList.length })}
        </button>
      </div>

      {/* 5. Section 4: Where you'll sleep */}
      <div className="pt-8 flex flex-col gap-5">
        <h3 className="text-xl font-bold text-neutral-900">{t("sleepingArrangements")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {resolvedBeds.map((item, idx) => (
            <div
              key={idx}
              className="border border-neutral-200 rounded-2xl p-5 flex flex-col gap-2 bg-neutral-50/50"
            >
              <div className="flex items-center gap-2 text-neutral-800 mb-2">
                <IoBedOutline size={24} />
                {idx === 2 && <BiBed size={22} />}
              </div>
              <span className="font-semibold text-neutral-900 text-sm">{item.room}</span>
              <span className="text-xs text-neutral-500">{item.bed}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Section 5 & 6: House Rules & Cancellation Policy */}
      <div className="pt-8 flex flex-col gap-6">
        <h3 className="text-xl font-bold text-neutral-900">{t("houseRules")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-700">
          <div className="flex items-center gap-3">
            <MdOutlineAccessTime size={20} className="text-neutral-500" />
            <span>{t("checkIn", { time: houseRules?.checkIn || "3:00 PM" })}</span>
          </div>
          <div className="flex items-center gap-3">
            <MdOutlineAccessTime size={20} className="text-neutral-500" />
            <span>{t("checkOut", { time: houseRules?.checkOut || "11:00 AM" })}</span>
          </div>
          <div className="flex items-center gap-3">
            <MdOutlinePets size={20} className="text-neutral-500" />
            <span>{houseRules?.petsAllowed ? "Pets allowed" : "No pets allowed"}</span>
          </div>
          <div className="flex items-center gap-3">
            <MdOutlineSmokeFree size={20} className="text-neutral-500" />
            <span>{houseRules?.smokingAllowed ? "Smoking allowed" : "No smoking"}</span>
          </div>
        </div>

        {/* Cancellation Policy Box */}
        <div className="mt-4 border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-neutral-900">{t("cancellationPolicy")}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 capitalize">
              {cancellationPolicy}
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">{t("cancellationPolicyDesc")}</p>
        </div>
      </div>

      {/* 7. Section 7: Reviews Breakdown Meters & List */}
      <div id="reviews-section" className="pt-8 flex flex-col gap-6 scroll-mt-28">
        <div className="flex items-center gap-2">
          <MdStar className="text-neutral-900" size={24} />
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
            {rating.toFixed(2)} · {t("reviewsCount", { count: reviewCount })}
          </h3>
        </div>

        {/* Rating Breakdown 6-Meter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3.5 pt-2">
          {[
            { label: t("cleanliness"), value: resolvedBreakdown.cleanliness },
            { label: t("accuracy"), value: resolvedBreakdown.accuracy },
            { label: t("communication"), value: resolvedBreakdown.communication },
            { label: t("location"), value: resolvedBreakdown.location },
            { label: t("checkInRating"), value: resolvedBreakdown.checkIn },
            { label: t("value"), value: resolvedBreakdown.value },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-neutral-700 font-medium">{item.label}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 sm:w-32 bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-1.5 rounded-full"
                    style={{ width: `${(item.value / 5) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-xs text-neutral-900 w-6 text-end">
                  {item.value.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Sample Reviews Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          {mockReviews.map((rev) => (
            <div key={rev.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-sm">
                  {rev.author.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-neutral-900">{rev.author}</span>
                  <span className="text-xs text-neutral-500">{rev.date}</span>
                </div>
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{rev.comment}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsReviewsModalOpen(true)}
          className="self-start py-3 px-6 rounded-xl border border-neutral-900 font-semibold text-neutral-900 hover:bg-neutral-50 text-sm transition cursor-pointer mt-2"
        >
          {t("showAllReviews", { count: reviewCount })}
        </button>
      </div>

      {/* 8. Section 8: Where you'll be (Map with Approximate Location Circle) */}
      <div id="location-section" className="pt-8 flex flex-col gap-4 scroll-mt-28">
        <h3 className="text-xl font-bold text-neutral-900">{t("whereYoullBe")}</h3>
        <p className="text-sm text-neutral-500">{t("approximateLocation")}</p>
        <div className="w-full h-[360px] rounded-2xl overflow-hidden shadow-xs border border-neutral-200">
          <Map center={mapCenter} locationValue={locationValue} isApproximate={true} zoom={13} />
        </div>
      </div>

      {/* 9. Section 9: Meet your Host */}
      <div className="pt-8 flex flex-col gap-6">
        <h3 className="text-xl font-bold text-neutral-900">{t("hostCardTitle")}</h3>
        <div className="bg-neutral-50/70 border border-neutral-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex items-center gap-5">
            <Avatar src={user?.image} userName={user?.name} />
            <div className="flex flex-col">
              <h4 className="text-lg font-bold text-neutral-900">{user?.name || "Host"}</h4>
              <span className="text-xs text-neutral-500">
                {t("yearsHosting", { count: hostInfo?.yearsHosting || 4 })}
              </span>
              <div className="flex items-center gap-3 text-xs text-neutral-600 mt-2">
                <span>{t("responseRate", { rate: hostInfo?.responseRate || 100 })}</span>
                <span>·</span>
                <span>{t("responseTime", { time: hostInfo?.responseTime || "an hour" })}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toast.info(`Message feature: Contact ${user?.name || "Host"}`)}
            className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-semibold transition cursor-pointer self-stretch sm:self-auto text-center"
          >
            {t("messageHost")}
          </button>
        </div>
      </div>

      {/* 10. Section 10: Things to know */}
      <div className="pt-8 flex flex-col gap-6">
        <h3 className="text-xl font-bold text-neutral-900">{t("thingsToKnow")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-neutral-700">
          {/* Col 1: House rules */}
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-neutral-900">{t("houseRules")}</h4>
            <span>{t("checkIn", { time: houseRules?.checkIn || "3:00 PM" })}</span>
            <span>{t("checkOut", { time: houseRules?.checkOut || "11:00 AM" })}</span>
            <span>{houseRules?.maxGuests || guestCount} guests maximum</span>
          </div>

          {/* Col 2: Safety & Property */}
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-neutral-900">{t("safetyProperty")}</h4>
            <div className="flex items-center gap-2">
              <MdOutlineSecurity size={16} />
              <span>Carbon monoxide alarm</span>
            </div>
            <div className="flex items-center gap-2">
              <MdOutlineSecurity size={16} />
              <span>Smoke alarm</span>
            </div>
            <div className="flex items-center gap-2">
              <MdOutlineSecurity size={16} />
              <span>Security cameras on property</span>
            </div>
          </div>

          {/* Col 3: Cancellation policy */}
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-neutral-900">{t("cancellationPolicy")}</h4>
            <span className="capitalize">{cancellationPolicy} cancellation</span>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {t("cancellationPolicyDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Full Amenities Modal */}
      {isAmenitiesModalOpen && (
        <div
          onClick={() => setIsAmenitiesModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="sticky top-0 bg-white pb-4 border-b border-neutral-200 flex items-center justify-between z-10">
              <h3 className="font-bold text-lg text-neutral-900">{t("amenitiesTitle")}</h3>
              <button
                type="button"
                onClick={() => setIsAmenitiesModalOpen(false)}
                className="p-2 rounded-full hover:bg-neutral-100 transition cursor-pointer text-neutral-600"
              >
                <IoClose size={20} />
              </button>
            </div>

            <div className="py-6 flex flex-col gap-4 divide-y divide-neutral-100">
              {fullAmenitiesList.map((item, idx) => {
                const IconComp = amenityIcons[item] || MdOutlineDeck;
                return (
                  <div key={idx} className="pt-3 flex items-center gap-4 text-neutral-800">
                    <IconComp size={24} className="text-neutral-700 flex-shrink-0" />
                    <span className="font-medium text-base">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Reviews Modal */}
      {isReviewsModalOpen && (
        <div
          onClick={() => setIsReviewsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="sticky top-0 bg-white pb-4 border-b border-neutral-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <MdStar size={22} className="text-neutral-900" />
                <h3 className="font-bold text-lg text-neutral-900">
                  {rating.toFixed(2)} · {t("reviewsCount", { count: reviewCount })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewsModalOpen(false)}
                className="p-2 rounded-full hover:bg-neutral-100 transition cursor-pointer text-neutral-600"
              >
                <IoClose size={20} />
              </button>
            </div>

            <div className="py-6 flex flex-col gap-6 divide-y divide-neutral-100">
              {[...mockReviews, ...mockReviews].map((rev, idx) => (
                <div key={idx} className="pt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-sm">
                      {rev.author.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-neutral-900">{rev.author}</span>
                      <span className="text-xs text-neutral-500">{rev.date}</span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
