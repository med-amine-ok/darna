"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { formatISO } from "date-fns";
import { Range } from "react-date-range";
import { useSearchModal } from "@/hook/useSearchModal";
import Modal from "./Modal";
import Heading from "@/components/Heading";
import Calendar from "@/components/inputs/Calendar";
import Counter from "@/components/inputs/Counter";
import { useTranslations } from "next-intl";
import Image from "next/image";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
  INFO = 2,
}

const ALGERIAN_DESTINATIONS = [
  { name: "Algiers", wilaya: "Wilaya 16", tag: "Historic Casbah & Coastal Bays" },
  { name: "Oran", wilaya: "Wilaya 31", tag: "Santa Cruz Fortress & Corniche" },
  { name: "Constantine", wilaya: "Wilaya 25", tag: "City of Suspension Bridges" },
  { name: "Tipaza", wilaya: "Wilaya 42", tag: "Roman Ruins & Mediterranean Coast" },
  { name: "Tlemcen", wilaya: "Wilaya 13", tag: "Andalusian Art & Architecture" },
  { name: "Djanet", wilaya: "Wilaya 56", tag: "Tassili n'Ajjer Rock Art & Dunes" },
  { name: "Taghit", wilaya: "Wilaya 53", tag: "Grand Erg Occidental Oasis" },
  { name: "Ghardaïa", wilaya: "Wilaya 47", tag: "UNESCO M'zab Valley Ksars" },
  { name: "Béjaïa", wilaya: "Wilaya 06", tag: "Cap Carbon & Gouraya Cliffs" },
  { name: "Annaba", wilaya: "Wilaya 23", tag: "Basilica of St Augustine & Beaches" },
];

export default function SearchModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchModal = useSearchModal();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState(STEPS.LOCATION);
  const [destination, setDestination] = useState<string>("");
  const [guestCount, setGuestCount] = useState(1);
  const [roomCount, setRoomCount] = useState(1);
  const [bathroomCount, setBathroomCount] = useState(1);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    key: "selection",
  });

  const onBack = useCallback(() => {
    setStep((value) => value - 1);
  }, []);

  const onNext = useCallback(() => {
    setStep((value) => value + 1);
  }, []);

  const onSubmit = useCallback(async () => {
    if (step !== STEPS.INFO) {
      return onNext();
    }

    let currentQuery = {};
    if (searchParams) {
      currentQuery = qs.parse(searchParams.toString());
    }

    const updatedQuery: any = {
      ...currentQuery,
      destination: destination || undefined,
      guestCount,
      roomCount,
      bathroomCount,
    };

    if (dateRange.startDate) {
      updatedQuery.startDate = formatISO(dateRange.startDate);
    }

    if (dateRange.endDate) {
      updatedQuery.endDate = formatISO(dateRange.endDate);
    }

    const url = qs.stringifyUrl(
      {
        url: "/search",
        query: updatedQuery,
      },
      { skipNull: true }
    );

    setStep(STEPS.LOCATION);
    searchModal.onClose();
    router.push(url);
  }, [
    step,
    searchModal,
    destination,
    guestCount,
    roomCount,
    bathroomCount,
    dateRange,
    onNext,
    searchParams,
    router,
  ]);

  const actionLabel = useMemo(() => {
    if (step === STEPS.INFO) {
      return tNav("search") || "Search";
    }
    return tCommon("next") || "Next";
  }, [step, tNav, tCommon]);

  const secondaryActionLabel = useMemo(() => {
    if (step === STEPS.LOCATION) {
      return undefined;
    }
    return tCommon("back") || "Back";
  }, [step, tCommon]);

  let bodyContent = (
    <div className="flex flex-col gap-6">
      <Heading
        title="Where do you want to go?"
        subtitle="Explore top Algerian wilayas, coastal villas, or desert getaways"
      />

      {/* Destination text input */}
      <div className="relative">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Search destinations (e.g. Tipaza, Algiers, Djanet)..."
          className="w-full p-4 ps-11 border border-tertiary rounded-2xl outline-none focus:border-primary text-primary font-medium text-sm sm:text-base"
        />
        <Image
          src="/assets/location.png"
          alt="Location"
          width={20}
          height={20}
          className="absolute start-3.5 top-1/2 -translate-y-1/2 object-contain"
        />
      </div>

      {/* Quick Select Algerian Cities */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          Popular in Algeria
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pe-1">
          {ALGERIAN_DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              type="button"
              onClick={() => setDestination(dest.name)}
              className={`p-2.5 rounded-xl border text-start flex items-center gap-3 transition cursor-pointer ${
                destination === dest.name
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-tertiary/60 hover:border-tertiary text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-tertiary/30 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                {dest.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs sm:text-sm text-primary truncate">
                  {dest.name}
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {dest.tag}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === STEPS.DATE) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        <Heading
          title="When are you traveling?"
          subtitle="Select dates for your stay, experience, or vehicle rental"
        />
        <div className="flex justify-center overflow-x-auto">
          <Calendar
            value={dateRange}
            onChange={(value) => setDateRange(value.selection)}
          />
        </div>
      </div>
    );
  }

  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        <Heading
          title="Who is coming?"
          subtitle="Add guests or passengers for your trip"
        />
        <Counter
          title="Guests"
          subtitle="Total adults and children"
          value={guestCount}
          onChange={(v) => setGuestCount(v)}
        />
        <hr className="border-tertiary/40" />
        <Counter
          title="Rooms / Spaces"
          subtitle="How many bedrooms or separate rooms?"
          value={roomCount}
          onChange={(v) => setRoomCount(v)}
        />
        <hr className="border-tertiary/40" />
        <Counter
          title="Bathrooms"
          subtitle="Minimum bathrooms desired"
          value={bathroomCount}
          onChange={(v) => setBathroomCount(v)}
        />
      </div>
    );
  }

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={searchModal.onClose}
      onSubmit={onSubmit}
      secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
      secondaryActionLabel={secondaryActionLabel}
      title={tNav("search") || "Search DARNA"}
      actionLabel={actionLabel}
      body={bodyContent}
    />
  );
}
