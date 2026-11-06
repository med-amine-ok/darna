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
import { Button, Dialog, IconButton, cn, useIsRtl } from "@/components/ui";
import { slideIn } from "@/lib/motion";
import { shortDayLabel } from "@/components/search/dateLabels";
import { useDestinationLabel } from "@/hook/useDestinationLabel";
import WherePopover from "@/components/navbar/search/WherePopover";
import WhenPopover, { type FlexDays } from "@/components/navbar/search/WhenPopover";
import WhoPopover, { DEFAULT_PARTY, partyGuests, type Party } from "@/components/navbar/search/WhoPopover";
import TypePopover from "@/components/navbar/search/TypePopover";
import { useVertical } from "@/hook/useVertical";
import { experienceTypeLabel, tripTypeLabel } from "@/lib/catalog-types";
import { BrandCloseIcon, BrandSearchIcon, BrandChevronLeftIcon } from "@/components/icons";

type StepId = "type" | "where" | "when" | "who";

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

  const vertical = useVertical((s) => s.activeVertical) || "home";
  const typeVertical = vertical === "experience" || vertical === "trip" ? vertical : null;
  const order: StepId[] = typeVertical ? ["type", "where", "when", "who"] : ["where", "when", "who"];
  const [stepIndex, setStepIndex] = useState(0);
  const step = order[Math.min(stepIndex, order.length - 1)];
  const [direction, setDirection] = useState<1 | -1>(1);
  const [destination, setDestination] = useState<string>("");
  const [party, setParty] = useState<Party>(DEFAULT_PARTY);
  const [types, setTypes] = useState<string[]>([]);
  const guestCount = partyGuests(party);
  const [flexDays, setFlexDays] = useState<FlexDays>(0);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    key: "selection",
  });

  const goTo = useCallback(
    (next: number) => {
      setDirection(next >= stepIndex ? 1 : -1);
      setStepIndex(next);
    },
    [stepIndex]
  );

  const close = useCallback(() => {
    closeSearchModal();
    setStepIndex(0);
  }, [closeSearchModal]);

  const isLast = stepIndex >= order.length - 1;

  const onSubmit = useCallback(() => {
    if (!isLast) return goTo(stepIndex + 1);

    const updatedQuery: qs.StringifiableRecord = {
      ...(searchParams ? qs.parse(searchParams.toString()) : {}),
      vertical: vertical === "home" ? undefined : vertical,
      destination: destination || undefined,
      guests: guestCount > 1 ? guestCount : undefined,
      adults: vertical === "vehicle" ? undefined : party.adults,
      children: party.children || undefined,
      infants: vertical === "home" && party.infants ? party.infants : undefined,
      rooms: vertical === "hotel" ? party.rooms : undefined,
      expType: typeVertical === "experience" && types.length ? types.join(",") : undefined,
      tripType: typeVertical === "trip" && types.length ? types.join(",") : undefined,
    };
    if (dateRange.startDate) updatedQuery.startDate = formatISO(dateRange.startDate);
    if (dateRange.endDate) updatedQuery.endDate = formatISO(dateRange.endDate);

    const url = qs.stringifyUrl({ url: "/search", query: updatedQuery }, { skipNull: true });
    close();
    router.push(url);
  }, [isLast, goTo, stepIndex, searchParams, vertical, typeVertical, types, destination, guestCount, party, dateRange, close, router]);

  const resetAll = () => {
    setDestination("");
    setParty(DEFAULT_PARTY);
    setTypes([]);
    setFlexDays(0);
    setDateRange({ startDate: new Date(), endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), key: "selection" });
    goTo(0);
  };

  const dateSummary =
    dateRange.startDate && dateRange.endDate
      ? tCommon("dateRange", { start: shortDayLabel(dateRange.startDate, locale), end: shortDayLabel(dateRange.endDate, locale) }) +
        (flexDays ? ` · ${t("flex.short", { count: flexDays })}` : "")
      : t("bar.home.whenPlaceholder");

  const tv = typeVertical ?? "experience";
  const typeSummary =
    types.length === 0
      ? t(`bar.${tv}.typeAny`)
      : types.length === 1
        ? tv === "trip"
          ? tripTypeLabel(types[0], locale)
          : experienceTypeLabel(types[0], locale)
        : t("typeCount", { count: types.length });

  const allSteps: Record<StepId, { label: string; title: string; summary: string }> = {
    type: { label: t(`bar.${tv}.typeTitle`), title: t(`bar.${tv}.typeTitle`), summary: typeSummary },
    where: { label: t(`bar.${vertical}.whereTitle`), title: t("modal.whereTitle"), summary: destination ? destinationLabel(destination) : t("anywhereInAlgeria") },
    when: { label: t(`bar.${vertical}.whenTitle`), title: t("modal.whenTitle"), summary: dateSummary },
    who: {
      label: t(`bar.${vertical}.whoTitle`),
      title: t("modal.whoTitle"),
      summary: vertical === "vehicle" ? t("passengerCount", { count: guestCount }) : t("guestCount", { count: guestCount }),
    },
  };
  const steps = order.map((id, index) => ({ id, index, ...allSteps[id] }));

  const variants = slideIn(direction === 1 ? "end" : "start", isRtl, 32);

  const body =
    step === "type" && typeVertical ? (
      <TypePopover vertical={typeVertical} selected={types} onChange={setTypes} />
    ) : step === "where" ? (
      <WherePopover
        query={destination}
        onQueryChange={setDestination}
        onSelect={(d) => {
          setDestination(d.name);
          goTo(stepIndex + 1);
        }}
        placeholder={t("modal.destinationPlaceholder")}
        autoFocus={false}
        tall
      />
    ) : step === "when" ? (
      <div className="flex justify-center">
        <WhenPopover dateRange={dateRange} onChangeDateRange={setDateRange} label={t("modal.whenSubtitle")} flexDays={flexDays} onFlexDaysChange={setFlexDays} />
      </div>
    ) : (
      <WhoPopover vertical={vertical as "home"} party={party} onChange={setParty} />
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
        {stepIndex > 0 ? (
          <IconButton label={tCommon("back")} icon={<BrandChevronLeftIcon size={18} className="rtl:rotate-180" />} variant="tertiary" size="sm" onClick={() => goTo(stepIndex - 1)} />
        ) : (
          <span className="w-9" aria-hidden="true" />
        )}
        <ol className="flex items-center gap-1.5" aria-label={t("modal.title")}>
          {steps.map((s) => (
            <li key={s.id}>
              <span
                aria-current={s.id === step ? "step" : undefined}
                className={cn("block h-1.5 rounded-full transition-[width,background-color] duration-base ease-out", s.id === step ? "w-6 bg-primary-800" : s.index < stepIndex ? "w-1.5 bg-primary-500" : "w-1.5 bg-primary/20")}
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
              onClick={() => goTo(s.index)}
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
        <Button size="lg" onClick={onSubmit} leadingIcon={isLast ? <BrandSearchIcon size={18} /> : undefined}>
          {isLast ? tNav("search") : tCommon("next")}
        </Button>
      </div>
    </Dialog>
  );
}
