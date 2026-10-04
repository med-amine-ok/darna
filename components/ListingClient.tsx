"use client";

import useLoginModel from "@/hook/useLoginModal";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import axios from "axios";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import { useRouter } from "@/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Range } from "react-date-range";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

import Container from "./Container";
import ListingHead from "./listing/ListingHead";
import ListingInfo from "./listing/ListingInfo";
import ListingReservation from "./listing/ListingReservation";
import ListingCard from "./listing/ListingCard";
import PriceDisplay from "./common/PriceDisplay";
import { categories } from "./navbar/Categories";

import { format } from "date-fns";
import { IoClose } from "react-icons/io5";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: "selection",
};

type Props = {
  reservations?: SafeReservation[];
  listing: safeListing & {
    user: SafeUser;
  };
  currentUser?: SafeUser | null;
  similarListings?: safeListing[];
};

function ListingClient({
  reservations = [],
  listing,
  currentUser,
  similarListings = [],
}: Props) {
  const router = useRouter();
  const loginModal = useLoginModel();
  const t = useTranslations("listing");
  const tCommon = useTranslations("common");

  const [isMobileReserveModalOpen, setIsMobileReserveModalOpen] = useState(false);

  const disableDates = useMemo(() => {
    let dates: Date[] = [];

    reservations.forEach((reservation) => {
      const range = eachDayOfInterval({
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate),
      });

      dates = [...dates, ...range];
    });

    return dates;
  }, [reservations]);

  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [dateRange, setDateRange] = useState<Range>(initialDateRange);

  const onCreateReservation = useCallback(() => {
    if (!currentUser) {
      return loginModal.onOpen();
    }

    setIsLoading(true);

    axios
      .post("/api/reservations", {
        totalPrice,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        listingId: listing?.id,
      })
      .then(() => {
        toast.success(tCommon("success"));
        setDateRange(initialDateRange);
        router.push("/trips");
      })
      .catch(() => {
        toast.error(tCommon("error"));
      })
      .finally(() => {
        setIsLoading(false);
        setIsMobileReserveModalOpen(false);
      });
  }, [totalPrice, dateRange, listing?.id, router, currentUser, loginModal, tCommon]);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const dayCount = differenceInCalendarDays(
        dateRange.endDate,
        dateRange.startDate
      );

      if (dayCount && listing.price) {
        setTotalPrice(dayCount * listing.price);
      } else {
        setTotalPrice(listing.price);
      }
    }
  }, [dateRange, listing.price]);

  const category = useMemo(() => {
    return categories.find((item) => item.label === listing.category);
  }, [listing.category]);

  const isVehicle = listing.type === "Vehicles" || listing.category === "Vehicles";

  return (
    <Container>
      <div className="max-w-7xl mx-auto pb-20 lg:pb-12">
        <div className="flex flex-col gap-6">
          <ListingHead
            title={listing.title}
            imageSrc={listing.imageSrc}
            images={listing.images}
            locationValue={listing.locationValue}
            id={listing.id}
            currentUser={currentUser}
            rating={listing.rating}
            reviewCount={listing.reviewCount}
          />

          {/* Two-Column Layout: Content ~60% (7 cols), Sticky Widget ~40% (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 mt-6">
            {/* Left Column (60% on desktop) */}
            <div className="lg:col-span-7">
              <ListingInfo
                user={listing.user}
                category={category}
                description={listing.description}
                roomCount={listing.roomCount}
                guestCount={listing.guestCount}
                bathroomCount={listing.bathroomCount}
                locationValue={listing.locationValue}
                coordinates={listing.coordinates}
                highlights={listing.highlights}
                amenities={listing.amenities}
                sleepingArrangements={listing.sleepingArrangements}
                houseRules={listing.houseRules}
                ratingBreakdown={listing.ratingBreakdown}
                hostInfo={listing.hostInfo}
                cancellationPolicy={listing.cancellationPolicy}
                rating={listing.rating}
                reviewCount={listing.reviewCount}
                isSuperhost={listing.isSuperhost}
                isGuestFavorite={listing.isGuestFavorite}
              />
            </div>

            {/* Right Column: Desktop Sticky Booking Widget (40% on desktop) */}
            <div className="hidden lg:block lg:col-span-5 relative">
              <div className="sticky top-24 z-20">
                <ListingReservation
                  price={listing.price}
                  totalPrice={totalPrice}
                  onChangeDate={(value) => setDateRange(value)}
                  dateRange={dateRange}
                  onSubmit={onCreateReservation}
                  disabled={isLoading}
                  disabledDates={disableDates}
                  rating={listing.rating}
                  reviewCount={listing.reviewCount}
                  isVehicle={isVehicle}
                />
              </div>
            </div>
          </div>

          {/* Section 11: Similar Listings Carousel */}
          {similarListings && similarListings.length > 0 && (
            <div className="pt-16 mt-8 border-t border-neutral-200">
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">
                {t("similarListings")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {similarListings.map((sim) => (
                  <ListingCard key={sim.id} data={sim} currentUser={currentUser} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Reserve Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200/90 py-3 px-4 sm:px-6 flex items-center justify-between z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col">
          <PriceDisplay
            price={listing.price}
            period={`/ ${isVehicle ? tCommon("day") : tCommon("night")}`}
            priceClassName="text-base sm:text-lg font-bold text-neutral-900"
          />
          <button
            type="button"
            onClick={() => setIsMobileReserveModalOpen(true)}
            className="text-xs text-neutral-600 underline font-medium text-start"
          >
            {dateRange.startDate && dateRange.endDate
              ? `${format(dateRange.startDate, "MMM d")} - ${format(dateRange.endDate, "MMM d")}`
              : t("selectDates")}
          </button>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (dateRange.startDate && dateRange.endDate) {
              onCreateReservation();
            } else {
              setIsMobileReserveModalOpen(true);
            }
          }}
          className="bg-accent hover:bg-accent-600 active:bg-accent-700 text-white py-3 px-7 rounded-xl font-bold text-sm shadow-sm transition disabled:opacity-50 cursor-pointer touch-manipulation"
        >
          {isVehicle ? "Reserve Vehicle" : t("reserve")}
        </button>
      </div>

      {/* Mobile Reservation Modal Sheet */}
      {isMobileReserveModalOpen && (
        <div
          onClick={() => setIsMobileReserveModalOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex flex-col justify-end cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl max-h-[85dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl cursor-default"
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-4">
              <h3 className="font-bold text-lg text-neutral-900">
                {isVehicle ? "Select Pick-up & Return Dates" : t("selectDatesGuests")}
              </h3>
              <button
                type="button"
                aria-label="Close reservation modal"
                onClick={() => setIsMobileReserveModalOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 touch-manipulation cursor-pointer"
              >
                <IoClose size={22} />
              </button>
            </div>
            <ListingReservation
              price={listing.price}
              totalPrice={totalPrice}
              onChangeDate={(value) => setDateRange(value)}
              dateRange={dateRange}
              onSubmit={onCreateReservation}
              disabled={isLoading}
              disabledDates={disableDates}
              isVehicle={isVehicle}
            />
          </div>
        </div>
      )}
    </Container>
  );
}

export default ListingClient;
