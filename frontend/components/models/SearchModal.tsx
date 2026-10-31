"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";
import qs from "query-string";
import { formatISO } from "date-fns";
import { Range } from "react-date-range";
import { AnimatePresence, m } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useSearchModal } from "@/hook/useSearchModal";
import Counter from "@/components/inputs/Counter";
import { Button, Dialog, IconButton, cn, useIsRtl } from "@/components/ui";
import { slideIn } from "@/lib/motion";
import { shortDayLabel } from "@/components/search/dateLabels";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import WherePopover from "@/components/navbar/search/WherePopover";
import WhenPopover, { type FlexDays } from "@/components/navbar/search/WhenPopover";
import { BrandCloseIcon, BrandSearchIcon, BrandChevronLeftIcon } from "@/components/icons";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
  INFO = 2,
}

/**
 * Full-screen search on phones (dialog on larger screens) as a stepped sheet:
 * Where → When → Who. Finished steps collapse into tappable summary rows; the active
 * step slides in from the reading direction.
 */
export default function SearchModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isRtl = useIsRtl();
  const isOpen = useSearchModal((s) => s.isOpen);
  const closeSearchModal = useSearchModal((s) => s.onClose);
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const t = useTranslations("search");
  const destinationLabel = useDestinationLabel();

  const [step, setStep] = useState(STEPS.LOCATION);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [destination, setDestination] = useState<string>("");
  const [guestCount, setGuestCount] = useState(1);
  const [roomCount, setRoomCount] = useState(1);
  const [bathroomCount, setBathroomCount] = useState(1);
  const [flexDays, setFlexDays] = useState<FlexDays>(0);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    key: "selection",
  });

  const goTo = useCallback(
    (next: STEPS) => {
      setDirection(next >= step ? 1 : -1);
      setStep(next);
    },
    [step]
  );

  const close = useCallback(() => {
    closeSearchModal();
    setStep(STEPS.LOCATION);
  }, [closeSearchModal]);

  const onSubmit = useCallback(() => {
    if (step !== STEPS.INFO) return goTo(step + 1);

    const updatedQuery: qs.StringifiableRecord = {
      ...(searchParams ? qs.parse(searchParams.toString()) : {}),
      destination: destination || undefined,
      guests: guestCount,
      guestCount,
      rooms: roomCount,
      roomCount,
      bathrooms: bathroomCount,
      bathroomCount,
    };
    if (dateRange.startDate) updatedQuery.startDate = formatISO(dateRange.startDate);
    if (dateRange.endDate) updatedQuery.endDate = formatISO(dateRange.endDate);

    const url = qs.stringifyUrl({ url: "/search", query: updatedQuery }, { skipNull: true });
    close();
    router.push(url);
  }, [step, goTo, searchParams, destination, guestCount, roomCount, bathroomCount, dateRange, close, router]);

  const resetAll = () => {
    setDestination("");
    setGuestCount(1);
    setRoomCount(1);
    setBathroomCount(1);
    setFlexDays(0);
    setDateRange({ startDate: new Date(), endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), key: "selection" });
    goTo(STEPS.LOCATION);
  };

  const dateSummary =
    dateRange.startDate && dateRange.endDate
      ? tCommon("dateRange", { start: shortDayLabel(dateRange.startDate, locale), end: shortDayLabel(dateRange.endDate, locale) }) +
        (flexDays ? ` · ${t("flex.short", { count: flexDays })}` : "")
      : t("bar.home.whenPlaceholder");

  const steps = [
    { id: STEPS.LOCATION, label: t("bar.home.whereTitle"), title: t("modal.whereTitle"), summary: destination ? destinationLabel(destination) : t("anywhereInAlgeria") },
    { id: STEPS.DATE, label: t("bar.home.whenTitle"), title: t("modal.whenTitle"), summary: dateSummary },
    { id: STEPS.INFO, label: t("bar.home.whoTitle"), title: t("modal.whoTitle"), summary: t("guestCount", { count: guestCount }) },
  ];

  const variants = slideIn(direction === 1 ? "end" : "start", isRtl, 32);

  const body =
    step === STEPS.LOCATION ? (
      <WherePopover
        query={destination}
        onQueryChange={setDestination}
        onSelect={(d) => {
          setDestination(d.name);
          goTo(STEPS.DATE);
        }}
        placeholder={t("modal.destinationPlaceholder")}
        autoFocus={false}
        tall
      />
    ) : step === STEPS.DATE ? (
      <div className="flex justify-center">
        <WhenPopover dateRange={dateRange} onChangeDateRange={setDateRange} label={t("modal.whenSubtitle")} flexDays={flexDays} onFlexDaysChange={setFlexDays} />
      </div>
    ) : (
      <div className="divide-y divide-primary/[0.08]">
        <div className="pb-5">
          <Counter title={t("modal.guests")} subtitle={t("modal.guestsSubtitle")} value={guestCount} onChange={setGuestCount} />
        </div>
        <div className="py-5">
          <Counter title={t("modal.rooms")} subtitle={t("modal.roomsSubtitle")} value={roomCount} onChange={setRoomCount} />
        </div>
        <div className="pt-5">
          <Counter title={t("modal.bathrooms")} subtitle={t("modal.bathroomsSubtitle")} value={bathroomCount} onChange={setBathroomCount} />
        </div>
      </div>
    );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      ariaLabel={t("modal.title")}
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-darnaBg shadow-e4 sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-3xl"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:pt-4">
        {step > STEPS.LOCATION ? (
          <IconButton label={tCommon("back")} icon={<BrandChevronLeftIcon size={18} className="rtl:rotate-180" />} variant="tertiary" size="sm" onClick={() => goTo(step - 1)} />
        ) : (
          <span className="w-9" aria-hidden="true" />
        )}
        <ol className="flex items-center gap-1.5" aria-label={t("modal.title")}>
          {steps.map((s) => (
            <li key={s.id}>
              <span
                aria-current={s.id === step ? "step" : undefined}
                className={cn("block h-1.5 rounded-full transition-[width,background-color] duration-base ease-out", s.id === step ? "w-6 bg-primary-800" : s.id < step ? "w-1.5 bg-primary-500" : "w-1.5 bg-primary/20")}
              >
                <span className="sr-only">{s.label}</span>
              </span>
            </li>
          ))}
        </ol>
        <IconButton label={tCommon("close")} icon={<BrandCloseIcon size={18} />} variant="tertiary" size="sm" onClick={close} />
      </div>

      {/* Steps: summaries for the others, the active one as a white card */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
        {steps.map((s) =>
          s.id === step ? (
            <section key={s.id} aria-labelledby={`search-step-${s.id}`} className="overflow-hidden rounded-3xl bg-white p-5 shadow-e3">
              <h2 id={`search-step-${s.id}`} className="mb-4 font-serif text-heading text-primary-900">
                {s.title}
              </h2>
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={s.id} variants={variants} initial="hidden" animate="show" exit="exit">
                  {body}
                </m.div>
              </AnimatePresence>
            </section>
          ) : (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className="flex h-14 w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 text-start shadow-e1 cursor-pointer transition-shadow duration-fast ease-standard hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              <span className="text-sm text-primary-600">{s.label}</span>
              <span className="truncate text-sm font-semibold text-primary-900">{s.summary}</span>
            </button>
          )
        )}
      </div>

      {/* Footer */}
      <div className="glass flex shrink-0 items-center justify-between gap-3 border-t border-primary/[0.08] px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
        <Button variant="ghost" onClick={resetAll} className="-ms-3 underline underline-offset-4">
          {tCommon("clearAll")}
        </Button>
        <Button size="lg" onClick={onSubmit} leadingIcon={step === STEPS.INFO ? <BrandSearchIcon size={18} /> : undefined}>
          {step === STEPS.INFO ? tNav("search") : tCommon("next")}
        </Button>
      </div>
    </Dialog>
  );
}
