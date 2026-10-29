"use client";

import React, { useState, useMemo, useCallback, useId } from "react";
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
import { POPULAR_DESTINATIONS } from "@/components/search/destinations";
import { BrandPinIcon } from "@/components/icons";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
  INFO = 2,
}

export default function SearchModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = useSearchModal((s) => s.isOpen);
  const closeSearchModal = useSearchModal((s) => s.onClose);
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const t = useTranslations("search");
  const destinationInputId = useId();

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

    const updatedQuery: qs.StringifiableRecord = {
      ...currentQuery,
      destination: destination || undefined,
      guests: guestCount,
      guestCount,
      rooms: roomCount,
      roomCount,
      bathrooms: bathroomCount,
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
    closeSearchModal();
    router.push(url);
  }, [
    step,
    closeSearchModal,
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
      return tNav("search");
    }
    return tCommon("next");
  }, [step, tNav, tCommon]);

  const secondaryActionLabel = useMemo(() => {
    if (step === STEPS.LOCATION) {
      return undefined;
    }
    return tCommon("back");
  }, [step, tCommon]);

  let bodyContent = (
    <div className="flex flex-col gap-6">
      <Heading
        title={t("modal.whereTitle")}
        subtitle={t("modal.whereSubtitle")}
      />

      {/* Destination text input */}
      <div className="relative">
        <label htmlFor={destinationInputId} className="sr-only">
          {tNav("searchDestinations")}
        </label>
        <input
          id={destinationInputId}
          type="search"
          autoComplete="off"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={t("modal.destinationPlaceholder")}
          className="w-full p-4 ps-11 border border-tertiary rounded-2xl outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 text-primary font-medium text-sm sm:text-base"
        />
        <BrandPinIcon
          size={20}
          strokeWidth={1.8}
          className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
        />
      </div>

      {/* Quick Select Algerian Cities */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
          {t("popularInAlgeria")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pe-1">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.key}
              type="button"
              aria-pressed={destination === dest.name}
              onClick={() => setDestination(dest.name)}
              className={`p-2.5 rounded-xl border text-start flex items-center gap-3 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 ${
                destination === dest.name
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-tertiary/60 hover:border-tertiary text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-lg bg-tertiary/30 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs"
              >
                {String(dest.wilaya).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-xs sm:text-sm text-primary truncate">
                  {t(`destinations.${dest.key}.name`)}
                </span>
                <span className="block text-[11px] text-neutral-600 truncate">
                  {t("destinationMeta", { tag: t(`destinations.${dest.key}.tag`), wilaya: dest.wilaya })}
                </span>
              </span>
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
          title={t("modal.whenTitle")}
          subtitle={t("modal.whenSubtitle")}
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
          title={t("modal.whoTitle")}
          subtitle={t("modal.whoSubtitle")}
        />
        <Counter
          title={t("modal.guests")}
          subtitle={t("modal.guestsSubtitle")}
          value={guestCount}
          onChange={(v) => setGuestCount(v)}
        />
        <hr className="border-tertiary/40" />
        <Counter
          title={t("modal.rooms")}
          subtitle={t("modal.roomsSubtitle")}
          value={roomCount}
          onChange={(v) => setRoomCount(v)}
        />
        <hr className="border-tertiary/40" />
        <Counter
          title={t("modal.bathrooms")}
          subtitle={t("modal.bathroomsSubtitle")}
          value={bathroomCount}
          onChange={(v) => setBathroomCount(v)}
        />
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeSearchModal}
      onSubmit={onSubmit}
      secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
      secondaryActionLabel={secondaryActionLabel}
      title={t("modal.title")}
      actionLabel={actionLabel}
      body={bodyContent}
    />
  );
}
