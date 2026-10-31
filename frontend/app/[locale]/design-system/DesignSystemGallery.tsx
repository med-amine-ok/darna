"use client";

/**
 * Living gallery of the DARNA kit (dev only; see page.tsx). Shows every component of
 * components/ui in its states, plus the foundations (type, colour, elevation, radii, motion).
 * Strings come from the `ui.gallery` namespace so fr/ar (RTL) can be checked with the
 * locale links in the header.
 */

import React, { useRef, useState } from "react";
import { m } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import type { Range } from "react-date-range";
import { Link } from "@/navigation";
import { dur, ease, spring } from "@/lib/motion";
import {
  BrandArrowRightIcon,
  BrandCalendarIcon,
  BrandCashIcon,
  BrandDocumentIcon,
  BrandEditIcon,
  BrandEyeIcon,
  BrandFilterIcon,
  BrandHeartIcon,
  BrandHomeIcon,
  BrandBuildingIcon,
  BrandCompassIcon,
  BrandMoreIcon,
  BrandShareIcon,
  BrandStarIcon,
  BrandTrashIcon,
  BrandWifiIcon,
  BrandWaterIcon,
  BrandSearchIcon,
  BrandGridIcon,
  BrandListIcon,
  BrandMapIcon,
  BrandBadgeCheckIcon,
  BrandClockIcon,
  BrandShieldIcon,
  BrandUsersIcon,
} from "@/components/icons";
import {
  Accordion,
  Avatar,
  AvatarStack,
  Badge,
  Banner,
  BrandLoader,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogFooter,
  Divider,
  DropdownMenu,
  ErrorState,
  IconButton,
  Input,
  KitEmptyState,
  Pagination,
  Pill,
  Popover,
  ProgressBar,
  RadioGroup,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  SkeletonListingCard,
  SkeletonRow,
  StatCard,
  SuccessCelebration,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  Tooltip,
  type IllustrationVariant,
} from "@/components/ui";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import Modal from "@/components/models/Modal";
import Counter from "@/components/inputs/Counter";
import Calendar from "@/components/inputs/Calendar";

/* ------------------------------------------------------------------ layout helpers */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-primary/[0.08] py-14 first:border-t-0">
      <h2 id={`${id}-title`} className="font-serif text-display-md text-primary-900">
        {title}
      </h2>
      <div className="mt-8 space-y-10">{children}</div>
    </section>
  );
}

function Demo({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <h3 className="text-eyebrow uppercase font-semibold text-secondary-700">{title}</h3>
      {hint && <p className="mt-1 text-meta text-primary-500">{hint}</p>}
      <div className={`mt-4 ${className ?? "flex flex-wrap items-center gap-3"}`}>{children}</div>
    </div>
  );
}

const HUES = [
  { name: "primary", label: "Ink", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] },
  { name: "secondary", label: "Olive", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] },
  { name: "tertiary", label: "Sand", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] },
  { name: "accent", label: "Terracotta", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] },
  { name: "darnaBg", label: "Paper", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] },
] as const;

// Literal class names so Tailwind generates them.
const SWATCH: Record<string, string> = {
  "primary-50": "bg-primary-50", "primary-100": "bg-primary-100", "primary-200": "bg-primary-200", "primary-300": "bg-primary-300", "primary-400": "bg-primary-400", "primary-500": "bg-primary-500", "primary-600": "bg-primary-600", "primary-700": "bg-primary-700", "primary-800": "bg-primary-800", "primary-900": "bg-primary-900", "primary-950": "bg-primary-950",
  "secondary-50": "bg-secondary-50", "secondary-100": "bg-secondary-100", "secondary-200": "bg-secondary-200", "secondary-300": "bg-secondary-300", "secondary-400": "bg-secondary-400", "secondary-500": "bg-secondary-500", "secondary-600": "bg-secondary-600", "secondary-700": "bg-secondary-700", "secondary-800": "bg-secondary-800", "secondary-900": "bg-secondary-900", "secondary-950": "bg-secondary-950",
  "tertiary-50": "bg-tertiary-50", "tertiary-100": "bg-tertiary-100", "tertiary-200": "bg-tertiary-200", "tertiary-300": "bg-tertiary-300", "tertiary-400": "bg-tertiary-400", "tertiary-500": "bg-tertiary-500", "tertiary-600": "bg-tertiary-600", "tertiary-700": "bg-tertiary-700", "tertiary-800": "bg-tertiary-800", "tertiary-900": "bg-tertiary-900", "tertiary-950": "bg-tertiary-950",
  "accent-50": "bg-accent-50", "accent-100": "bg-accent-100", "accent-200": "bg-accent-200", "accent-300": "bg-accent-300", "accent-400": "bg-accent-400", "accent-500": "bg-accent-500", "accent-600": "bg-accent-600", "accent-700": "bg-accent-700", "accent-800": "bg-accent-800", "accent-900": "bg-accent-900", "accent-950": "bg-accent-950",
  "darnaBg-50": "bg-darnaBg-50", "darnaBg-100": "bg-darnaBg-100", "darnaBg-200": "bg-darnaBg-200", "darnaBg-300": "bg-darnaBg-300", "darnaBg-400": "bg-darnaBg-400", "darnaBg-500": "bg-darnaBg-500", "darnaBg-600": "bg-darnaBg-600", "darnaBg-700": "bg-darnaBg-700", "darnaBg-800": "bg-darnaBg-800", "darnaBg-900": "bg-darnaBg-900", "darnaBg-950": "bg-darnaBg-950",
};

const TYPE_SCALE = [
  { token: "display-xl", cls: "font-serif text-display-xl", key: "typeSample" },
  { token: "display-lg", cls: "font-serif text-display-lg", key: "typeSample" },
  { token: "display-md", cls: "font-serif text-display-md", key: "typeSample" },
  { token: "heading", cls: "text-heading font-medium", key: "typeSample" },
  { token: "title", cls: "text-title font-semibold", key: "typeSample" },
  { token: "body-lg", cls: "text-body-lg", key: "bodySample" },
  { token: "body", cls: "text-body", key: "bodySample" },
  { token: "meta", cls: "text-meta font-medium text-primary-600", key: "bodySample" },
  { token: "eyebrow", cls: "text-eyebrow uppercase font-semibold text-secondary-700", key: "eyebrowSample" },
] as const;

const MOTION_TOKENS = [
  { name: "micro · 120ms", duration: dur.micro, ease: ease.standard },
  { name: "fast · 200ms", duration: dur.fast, ease: ease.standard },
  { name: "base · 280ms", duration: dur.base, ease: ease.out },
  { name: "slow · 450ms", duration: dur.slow, ease: ease.out },
  { name: "page · 600ms", duration: dur.page, ease: ease.inOut },
  { name: "spring.press", spring: spring.press },
  { name: "spring.sheet", spring: spring.sheet },
  { name: "spring.layout", spring: spring.layout },
] as const;

function MotionRow({ token }: { token: (typeof MOTION_TOKENS)[number] }) {
  const t = useTranslations("ui.gallery");
  const isRtl = useLocale() === "ar";
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const transition = "spring" in token ? token.spring : { duration: token.duration, ease: token.ease };
  const toggle = () => {
    const w = (trackRef.current?.offsetWidth ?? 48) - 40;
    setTravel((cur) => (cur ? 0 : (isRtl ? -1 : 1) * w));
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
      <Button size="sm" variant="tertiary" onClick={toggle} className="w-28" trailingIcon={<BrandArrowRightIcon size={14} className="rtl:rotate-180" />}>
        {t("play")}
      </Button>
      <span className="w-32 shrink-0 text-meta font-medium text-primary-700 tabular-nums" dir="ltr">
        {token.name}
      </span>
      <div ref={trackRef} className="relative h-10 min-w-[10rem] flex-1 rounded-full bg-darnaBg-300/70">
        <m.span className="absolute start-1 top-1 h-8 w-8 rounded-full bg-cta shadow-glow" animate={{ x: travel }} transition={transition} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ gallery */

export default function DesignSystemGallery() {
  const t = useTranslations("ui.gallery");
  const locale = useLocale();

  // Buttons
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const runSave = () => {
    setSaved(false);
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 1400);
  };
  const [liked, setLiked] = useState(true);

  // Selection
  const [policy, setPolicy] = useState("flexible");
  const [instant, setInstant] = useState(true);
  const [sms, setSms] = useState(false);
  const [chips, setChips] = useState<Record<string, boolean>>({ wifi: true, pool: false, parking: false });
  const [tags, setTags] = useState(["oran", "tipaza", "ghardaia"]);

  // Navigation
  const [tab, setTab] = useState("upcoming");
  const [vertical, setVertical] = useState("homes");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(4);

  // Overlays
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adults, setAdults] = useState(2);

  // Feedback
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [progress, setProgress] = useState(64);

  // Data
  const [kpi, setKpi] = useState({ earnings: 184500, occupancy: 78, bookings: 26 });

  // Inputs in use
  const [guests, setGuests] = useState(2);
  const [range, setRange] = useState<Range>(() => {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    return { startDate: start, endDate: end, key: "selection" };
  });

  const sections = [
    ["foundations", t("foundations")],
    ["buttons", t("buttons")],
    ["fields", t("fields")],
    ["selection", t("selection")],
    ["chips", t("chips")],
    ["navigation", t("navigation")],
    ["overlays", t("overlays")],
    ["feedback", t("feedback")],
    ["loading", t("loading")],
    ["data", t("data")],
    ["inputs", t("inputsInUse")],
  ] as const;

  const empties: Array<[IllustrationVariant, string, string]> = [
    ["search", t("emptySearch"), t("emptySearchDesc")],
    ["favorites", t("emptyFavorites"), t("emptyFavoritesDesc")],
    ["messages", t("emptyMessages"), t("emptyMessagesDesc")],
    ["calendar", t("emptyCalendar"), t("emptyCalendarDesc")],
    ["generic", t("emptyGeneric"), t("emptyGenericDesc")],
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="enter-up relative overflow-hidden rounded-3xl bg-white p-6 shadow-e1 sm:p-10">
        <div aria-hidden="true" className="texture-zellige absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700">
              <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 font-serif text-display-lg text-primary-900">{t("title")}</h1>
            <p className="mt-3 text-body-lg text-primary-600">{t("intro")}</p>
          </div>
          <nav aria-label={t("language")} className="flex items-center gap-1 rounded-full bg-darnaBg-300 p-1 self-start lg:self-auto">
            {(["en", "fr", "ar"] as const).map((l) => (
              <Link
                key={l}
                href="/design-system"
                locale={l}
                aria-current={l === locale ? "page" : undefined}
                className={`inline-flex h-10 min-w-[3rem] items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-fast ${
                  l === locale ? "bg-white text-primary-900 shadow-e1" : "text-primary-600 hover:text-primary-900"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600`}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
        <nav aria-label={t("contents")} className="relative mt-8 flex flex-wrap gap-2">
          {sections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-meta font-semibold text-primary-700 shadow-e1 transition-shadow duration-fast hover:shadow-e2 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* ------------------------------------------------ Foundations */}
      <Section id="foundations" title={t("foundations")}>
        <Demo title={t("typeScale")} className="space-y-5">
          {TYPE_SCALE.map((row) => (
            <div key={row.token} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-baseline">
              <span className="text-meta font-medium text-primary-500 tabular-nums" dir="ltr">
                {row.token}
              </span>
              <p className={`${row.cls} text-primary-900 min-w-0`}>{t(row.key)}</p>
            </div>
          ))}
        </Demo>

        <Demo title={t("colours")} hint={t("coloursHint")} className="space-y-3">
          {HUES.map((hue) => (
            <div key={hue.name} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-center">
              <span className="text-meta font-semibold text-primary-800">
                {t(`hue.${hue.name}`)} <span className="font-normal text-primary-500" dir="ltr">· {hue.name}</span>
              </span>
              <div className="grid grid-cols-11 gap-1 sm:gap-1.5" dir="ltr">
                {hue.shades.map((s) => (
                  <div key={s} className="min-w-0">
                    <div className={`h-10 rounded-lg ring-1 ring-inset ring-primary/[0.06] sm:h-12 ${SWATCH[`${hue.name}-${s}`]}`} />
                    <span className="mt-1 block text-center text-[0.6875rem] text-primary-500 tabular-nums">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Demo>

        <Demo title={t("elevation")} className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(["shadow-e1", "shadow-e2", "shadow-e3", "shadow-e4", "shadow-e5"] as const).map((cls, i) => (
            <div key={cls} className={`flex h-28 flex-col justify-end rounded-2xl bg-white p-4 ${cls}`}>
              <span className="font-serif text-heading text-primary-900">e{i + 1}</span>
              <span className="text-meta text-primary-500">{t(`elevationUse.e${i + 1}`)}</span>
            </div>
          ))}
        </Demo>

        <Demo title={t("radii")} className="flex flex-wrap items-end gap-4">
          {[
            ["rounded-sm", "xs · 6"],
            ["rounded-lg", "sm · 10"],
            ["rounded-xl", "md · 14"],
            ["rounded-2xl", "lg · 20"],
            ["rounded-3xl", "xl · 28"],
            ["rounded-full", "pill"],
          ].map(([cls, label]) => (
            <div key={cls} className="flex flex-col items-center gap-2">
              <div className={`h-20 w-20 bg-tertiary-200 ring-1 ring-inset ring-tertiary-400/40 ${cls}`} />
              <span className="text-meta text-primary-600 tabular-nums" dir="ltr">
                {label}
              </span>
            </div>
          ))}
        </Demo>

        <Demo title={t("motion")} hint={t("motionHint")} className="space-y-3">
          {MOTION_TOKENS.map((tok) => (
            <MotionRow key={tok.name} token={tok} />
          ))}
        </Demo>
      </Section>

      {/* ------------------------------------------------ Buttons */}
      <Section id="buttons" title={t("buttons")}>
        <Demo title={t("variants")}>
          <Button>{t("reserve")}</Button>
          <Button variant="secondary">{t("continue")}</Button>
          <Button variant="tertiary" leadingIcon={<BrandShareIcon size={16} />}>
            {t("share")}
          </Button>
          <Button variant="ghost">{t("ghost")}</Button>
          <Button variant="destructive" leadingIcon={<BrandTrashIcon size={16} />}>
            {t("destructive")}
          </Button>
        </Demo>
        <Demo title={t("sizes")}>
          <Button size="sm">{t("small")}</Button>
          <Button size="md">{t("medium")}</Button>
          <Button size="lg">{t("large")}</Button>
          <Button size="lg" variant="secondary" trailingIcon={<BrandArrowRightIcon size={18} className="rtl:rotate-180" />}>
            {t("continue")}
          </Button>
        </Demo>
        <Demo title={t("states")} hint={t("tryLoading")}>
          <Button loading={saving} success={saved} onClick={runSave}>
            {saving ? t("saving") : saved ? t("saved") : t("loadingDemo")}
          </Button>
          <Button variant="secondary" loading>
            {t("saving")}
          </Button>
          <Button disabled>{t("disabled")}</Button>
          <Button variant="tertiary" disabled>
            {t("disabled")}
          </Button>
          <Button variant="ghost" href="/trips" trailingIcon={<BrandArrowRightIcon size={16} className="rtl:rotate-180" />}>
            {t("link")}
          </Button>
        </Demo>
        <Demo title={t("fullWidth")} className="max-w-sm">
          <Button size="lg" fullWidth>
            {t("reserve")}
          </Button>
        </Demo>
        <Demo title={t("iconButtons")}>
          <IconButton label={t("share")} icon={<BrandShareIcon size={18} />} />
          <IconButton label={t("save")} variant="tertiary" pressed={liked} onClick={() => setLiked((v) => !v)} icon={<BrandHeartIcon size={18} className={liked ? "fill-accent-600 text-accent-600" : ""} />} />
          <IconButton label={t("more")} variant="glass" icon={<BrandMoreIcon size={18} />} />
          <IconButton label={t("filters")} variant="secondary" icon={<BrandFilterIcon size={18} />} />
          <IconButton label={t("share")} size="sm" icon={<BrandShareIcon size={16} />} />
          <IconButton label={t("share")} size="lg" variant="tertiary" icon={<BrandShareIcon size={20} />} />
          <IconButton label={t("share")} loading variant="tertiary" icon={<BrandShareIcon size={18} />} />
          <IconButton label={t("share")} disabled variant="tertiary" icon={<BrandShareIcon size={18} />} />
        </Demo>
      </Section>

      {/* ------------------------------------------------ Fields */}
      <Section id="fields" title={t("fields")}>
        <div className="grid gap-6 md:grid-cols-2">
          <Input label={t("email")} type="email" helper={t("emailHelper")} autoComplete="off" />
          <Input label={t("fullName")} defaultValue="Amina Benali" required />
          <Input label={t("price")} prefix="DZD" defaultValue="800" inputMode="numeric" error={t("priceError")} />
          <Input label={t("search")} suffix={<BrandSearchIcon size={18} />} />
          <Input label={t("disabledField")} defaultValue="DRN-2026-0412" disabled />
          <Select
            label={t("wilaya")}
            placeholderOption={t("chooseWilaya")}
            defaultValue="31"
            options={[
              { value: "16", label: "Alger" },
              { value: "31", label: "Oran" },
              { value: "42", label: "Tipaza" },
              { value: "47", label: "Ghardaïa" },
              { value: "33", label: "Illizi (Djanet)" },
            ]}
          />
          <Textarea label={t("noteToHost")} placeholder={t("notePlaceholder")} maxLength={300} showCount containerClassName="md:col-span-2" />
        </div>
      </Section>

      {/* ------------------------------------------------ Selection */}
      <Section id="selection" title={t("selection")}>
        <div className="grid gap-10 md:grid-cols-2">
          <Demo title={t("checkboxes")} className="space-y-2">
            <Checkbox label={t("petsAllowed")} description={t("petsDesc")} defaultChecked />
            <Checkbox label={t("terms")} error={t("termsError")} />
            <Checkbox label={t("indeterminate")} indeterminate />
            <Checkbox label={t("disabled")} disabled />
          </Demo>
          <Demo title={t("switches")} className="space-y-5">
            <Switch label={t("instantBooking")} description={t("instantDesc")} checked={instant} onCheckedChange={setInstant} />
            <Switch label={t("smsAlerts")} checked={sms} onCheckedChange={setSms} />
            <Switch label={t("disabled")} disabled defaultChecked />
            <Switch ariaLabel={t("smsAlerts")} size="sm" checked={sms} onCheckedChange={setSms} />
          </Demo>
          <RadioGroup
            legend={t("cancellation")}
            name="policy"
            value={policy}
            onChange={setPolicy}
            options={[
              { value: "flexible", label: t("flexible"), description: t("flexibleDesc") },
              { value: "moderate", label: t("moderate"), description: t("moderateDesc") },
              { value: "strict", label: t("strict"), description: t("strictDesc"), disabled: true },
            ]}
          />
          <RadioGroup
            legend={t("cancellationCards")}
            name="policy-cards"
            value={policy}
            onChange={setPolicy}
            appearance="card"
            options={[
              { value: "flexible", label: t("flexible"), description: t("flexibleDesc") },
              { value: "moderate", label: t("moderate"), description: t("moderateDesc") },
            ]}
          />
        </div>
      </Section>

      {/* ------------------------------------------------ Chips, badges, avatars */}
      <Section id="chips" title={t("chips")}>
        <Demo title={t("chipsToggle")}>
          <Chip icon={<BrandWifiIcon size={16} />} selected={chips.wifi} onSelectedChange={(v) => setChips((c) => ({ ...c, wifi: v }))}>
            {t("wifi")}
          </Chip>
          <Chip icon={<BrandWaterIcon size={16} />} selected={chips.pool} onSelectedChange={(v) => setChips((c) => ({ ...c, pool: v }))}>
            {t("pool")}
          </Chip>
          <Chip selected={chips.parking} onSelectedChange={(v) => setChips((c) => ({ ...c, parking: v }))}>
            {t("parking")}
          </Chip>
          <Chip icon={<BrandFilterIcon size={16} />} onClick={() => setSheetOpen(true)}>
            {t("filters")}
          </Chip>
          <Chip size="sm" selected={false} disabled>
            {t("disabled")}
          </Chip>
        </Demo>
        <Demo title={t("chipsRemovable")}>
          {tags.map((tag) => (
            <Chip key={tag} onRemove={() => setTags((ts) => ts.filter((x) => x !== tag))}>
              {t(`place.${tag}`)}
            </Chip>
          ))}
          {tags.length < 3 && (
            <Button size="sm" variant="ghost" onClick={() => setTags(["oran", "tipaza", "ghardaia"])}>
              {t("reset")}
            </Button>
          )}
        </Demo>
        <Demo title={t("badges")}>
          <Badge tone="success" dot>
            {t("confirmed")}
          </Badge>
          <Badge tone="warning" icon={<BrandClockIcon size={12} />}>
            {t("pending")}
          </Badge>
          <Badge tone="danger">{t("cancelled")}</Badge>
          <Badge tone="neutral">{t("draft")}</Badge>
          <Badge tone="sand">{t("new")}</Badge>
          <Badge tone="ink">{t("new")}</Badge>
          <Badge tone="olive" size="md" icon={<BrandBadgeCheckIcon size={14} />}>
            {t("verifiedHost")}
          </Badge>
          <Pill tone="white" icon={<BrandStarIcon size={13} className="text-accent-600" />}>
            {t("guestFavourite")}
          </Pill>
          <span className="relative inline-flex overflow-hidden rounded-2xl bg-secondary-700 p-3">
            <Pill tone="glass" icon={<BrandShieldIcon size={13} />}>
              {t("verifiedHost")}
            </Pill>
          </span>
        </Demo>
        <Demo title={t("avatars")}>
          <Avatar name="Amina Benali" size="xl" verified />
          <Avatar name="Karim Haddad" size="lg" />
          <Avatar name="Yasmine Ould" size="md" verified />
          <Avatar name="Sofiane" size="sm" />
          <Avatar name="Nour" size="xs" />
          <Avatar name="سارة بن علي" size="lg" />
          <AvatarStack
            size="md"
            max={3}
            people={[{ name: "Amina Benali" }, { name: "Karim Haddad" }, { name: "Lina M" }, { name: "Omar T" }, { name: "Rym B" }]}
          />
        </Demo>
      </Section>

      {/* ------------------------------------------------ Navigation */}
      <Section id="navigation" title={t("navigation")}>
        <Demo title={t("tabs")} className="space-y-4">
          <Tabs
            id="ds-trips"
            ariaLabel={t("tabs")}
            value={tab}
            onChange={setTab}
            items={[
              { value: "upcoming", label: t("upcoming"), count: 2 },
              { value: "past", label: t("past"), count: 5 },
              { value: "cancelled", label: t("cancelledTab") },
            ]}
          />
          <TabPanel tabsId="ds-trips" value="upcoming" active={tab}>
            <p className="text-body text-primary-700">{t("tabPanelUpcoming")}</p>
          </TabPanel>
          <TabPanel tabsId="ds-trips" value="past" active={tab}>
            <p className="text-body text-primary-700">{t("tabPanelPast")}</p>
          </TabPanel>
          <TabPanel tabsId="ds-trips" value="cancelled" active={tab}>
            <p className="text-body text-primary-700">{t("tabPanelCancelled")}</p>
          </TabPanel>
          <div className="pt-2">
            <Tabs
              id="ds-vertical"
              variant="pill"
              ariaLabel={t("verticals")}
              value={vertical}
              onChange={setVertical}
              items={[
                { value: "homes", label: t("homes"), icon: <BrandHomeIcon size={18} /> },
                { value: "hotels", label: t("hotels"), icon: <BrandBuildingIcon size={18} /> },
                { value: "experiences", label: t("experiences"), icon: <BrandCompassIcon size={18} /> },
              ]}
            />
          </div>
        </Demo>
        <Demo title={t("segmented")}>
          <SegmentedControl
            ariaLabel={t("segmented")}
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: t("grid"), icon: <BrandGridIcon size={16} /> },
              { value: "list", label: t("list"), icon: <BrandListIcon size={16} /> },
              { value: "map", label: t("map"), icon: <BrandMapIcon size={16} /> },
            ]}
          />
          <SegmentedControl
            ariaLabel={t("segmented")}
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: t("grid") },
              { value: "list", label: t("list") },
              { value: "map", label: t("map") },
            ]}
          />
        </Demo>
        <Demo title={t("breadcrumbs")}>
          <Breadcrumbs items={[{ label: t("home"), href: "/" }, { label: t("place.oran"), href: "/search" }, { label: t("listingName") }]} />
        </Demo>
        <Demo title={t("pagination")}>
          <Pagination page={page} pageCount={12} onPageChange={setPage} />
        </Demo>
        <Demo title={t("accordion")} className="max-w-2xl">
          <Accordion
            className="w-full"
            defaultOpen={["cancel"]}
            items={[
              { id: "cancel", title: t("faqCancel"), content: <p>{t("faqCancelBody")}</p> },
              { id: "pay", title: t("faqPay"), content: <p>{t("faqPayBody")}</p> },
              { id: "host", title: t("faqHost"), content: <p>{t("faqHostBody")}</p> },
            ]}
          />
        </Demo>
      </Section>

      {/* ------------------------------------------------ Overlays */}
      <Section id="overlays" title={t("overlays")}>
        <Demo title={t("floating")}>
          <Tooltip content={t("tooltipText")}>
            <IconButton label={t("share")} variant="tertiary" icon={<BrandShareIcon size={18} />} />
          </Tooltip>
          <Tooltip content={t("tooltipText")} side="bottom">
            <Button variant="tertiary" size="sm">
              {t("tooltip")}
            </Button>
          </Tooltip>
          <Popover
            ariaLabel={t("guestsTitle")}
            trigger={
              <Button variant="tertiary" leadingIcon={<BrandUsersIcon size={16} />}>
                {t("guests")}
              </Button>
            }
            className="w-80"
          >
            {(close) => (
              <div>
                <p className="font-semibold text-primary-900">{t("guestsTitle")}</p>
                <Counter title={t("adults")} subtitle={t("adultsDesc")} value={adults} onChange={setAdults} maxValue={8} />
                <Button size="sm" variant="secondary" fullWidth onClick={close} className="mt-2">
                  {t("done")}
                </Button>
              </div>
            )}
          </Popover>
          <DropdownMenu
            ariaLabel={t("more")}
            trigger={<IconButton label={t("more")} variant="tertiary" icon={<BrandMoreIcon size={18} />} />}
            align="start"
            items={[
              { type: "label", label: t("listingName") },
              { label: t("edit"), icon: <BrandEditIcon size={16} />, onSelect: () => toast.info(t("edit")) },
              { label: t("duplicate"), icon: <BrandDocumentIcon size={16} />, onSelect: () => toast.info(t("duplicate")) },
              { label: t("preview"), icon: <BrandEyeIcon size={16} />, href: "/" },
              { type: "separator" },
              { label: t("deleteListing"), icon: <BrandTrashIcon size={16} />, destructive: true, onSelect: () => setConfirmOpen(true) },
            ]}
          />
        </Demo>
        <Demo title={t("modals")}>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            {t("openDialog")}
          </Button>
          <Button variant="tertiary" onClick={() => setSheetOpen(true)}>
            {t("openSheet")}
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            {t("openConfirm")}
          </Button>
          <Button variant="ghost" onClick={() => setModalOpen(true)}>
            {t("openModal")}
          </Button>
        </Demo>

        <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title={t("dialogTitle")} description={t("dialogBody")} showClose>
          <DialogFooter>
            <Button variant="tertiary" onClick={() => setDialogOpen(false)}>
              {t("keepBooking")}
            </Button>
            <Button variant="destructive" onClick={() => setDialogOpen(false)}>
              {t("cancelStay")}
            </Button>
          </DialogFooter>
        </Dialog>

        <Sheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={t("sheetTitle")}
          description={t("sheetDesc")}
          footer={
            <Button fullWidth size="lg" onClick={() => setSheetOpen(false)}>
              {t("showResults")}
            </Button>
          }
        >
          <div className="space-y-6">
            <ProgressBar label={t("priceRange")} value={45} tone="ink" showValue />
            <div className="flex flex-wrap gap-2">
              <Chip selected={chips.wifi} onSelectedChange={(v) => setChips((c) => ({ ...c, wifi: v }))} icon={<BrandWifiIcon size={16} />}>
                {t("wifi")}
              </Chip>
              <Chip selected={chips.pool} onSelectedChange={(v) => setChips((c) => ({ ...c, pool: v }))} icon={<BrandWaterIcon size={16} />}>
                {t("pool")}
              </Chip>
              <Chip selected={chips.parking} onSelectedChange={(v) => setChips((c) => ({ ...c, parking: v }))}>
                {t("parking")}
              </Chip>
            </div>
            <Switch label={t("instantBooking")} description={t("instantDesc")} checked={instant} onCheckedChange={setInstant} />
            <Counter title={t("guestsCounter")} subtitle={t("maxGuests")} value={guests} onChange={setGuests} maxValue={6} />
            <Select
              label={t("wilaya")}
              defaultValue="31"
              options={[
                { value: "16", label: "Alger" },
                { value: "31", label: "Oran" },
              ]}
            />
          </div>
        </Sheet>

        <ConfirmDialog
          isOpen={confirmOpen}
          title={t("confirmTitle")}
          message={t("confirmBody")}
          variant="destructive"
          confirmLabel={t("deleteListing")}
          onConfirm={() => new Promise<void>((r) => setTimeout(r, 900)).then(() => setConfirmOpen(false))}
          onCancel={() => setConfirmOpen(false)}
        />

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={() => setModalOpen(false)}
          title={t("modalTitle")}
          actionLabel={t("modalAction")}
          secondaryAction={() => setModalOpen(false)}
          secondaryActionLabel={t("keepBooking")}
          body={
            <div className="space-y-4">
              <p className="text-body text-primary-600">{t("modalBody")}</p>
              <Input label={t("email")} type="email" />
            </div>
          }
        />
      </Section>

      {/* ------------------------------------------------ Feedback */}
      <Section id="feedback" title={t("feedback")}>
        <Demo title={t("toasts")}>
          <Button variant="tertiary" size="sm" onClick={() => toast.success(t("toastSuccess"))}>
            {t("success")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => toast.error(t("toastError"))}>
            {t("error")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => toast.info(t("toastInfo"))}>
            {t("info")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => toast.warning(t("toastWarning"))}>
            {t("warning")}
          </Button>
        </Demo>
        <Demo title={t("banners")} className="grid items-start gap-3 md:grid-cols-2">
          <Banner tone="info" title={t("bannerInfoTitle")}>
            {t("bannerInfo")}
          </Banner>
          {bannerVisible ? (
            <Banner tone="success" onDismiss={() => setBannerVisible(false)} action={<Button size="sm" variant="tertiary">{t("viewListing")}</Button>}>
              {t("bannerSuccess")}
            </Banner>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setBannerVisible(true)}>
              {t("reset")}
            </Button>
          )}
          <Banner tone="warning" title={t("bannerWarningTitle")}>
            {t("bannerWarning")}
          </Banner>
          <Banner tone="danger">{t("bannerDanger")}</Banner>
        </Demo>
        <Demo title={t("progress")} className="grid max-w-xl gap-5">
          <ProgressBar label={t("completeness")} value={progress} showValue />
          <ProgressBar label={t("completeness")} value={progress} tone="olive" size="sm" showLabel={false} />
          <ProgressBar label={t("uploading")} indeterminate />
          <div className="flex gap-2">
            <Button size="sm" variant="tertiary" onClick={() => setProgress((p) => Math.max(0, p - 20))}>
              −20
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setProgress((p) => Math.min(100, p + 20))}>
              +20
            </Button>
          </div>
        </Demo>
        <Demo title={t("emptyStates")} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empties.map(([variant, title, desc]) => (
            <Card key={variant} padding="none">
              <KitEmptyState
                compact
                variant={variant}
                title={title}
                description={desc}
                action={variant === "favorites" ? <Button size="sm" variant="tertiary" href="/">{t("explore")}</Button> : undefined}
              />
            </Card>
          ))}
          <Card padding="none">
            <ErrorState compact onRetry={() => toast.info(t("retrying"))} detail="ERR · 7f3a" />
          </Card>
        </Demo>
        <Demo title={t("celebration")}>
          <Card variant="elevated" padding="lg" className="w-full max-w-xl">
            <SuccessCelebration
              key={celebrationKey}
              title={t("celebrationTitle")}
              description={t("celebrationDesc")}
              actions={
                <>
                  <Button href="/trips">{t("viewTrips")}</Button>
                  <Button variant="ghost" onClick={() => setCelebrationKey((k) => k + 1)}>
                    {t("replay")}
                  </Button>
                </>
              }
            />
          </Card>
        </Demo>
      </Section>

      {/* ------------------------------------------------ Loading */}
      <Section id="loading" title={t("loading")}>
        <Demo title={t("loader")} className="grid gap-4 md:grid-cols-2">
          <Card className="flex items-center justify-center">
            <BrandLoader fullPage={false} />
          </Card>
          <Card padding="none">
            <BrandLoader fullPage className="!min-h-[16rem]" />
          </Card>
        </Demo>
        <Demo title={t("skeletons")} className="grid gap-6 md:grid-cols-3">
          <SkeletonListingCard />
          <div className="space-y-5">
            <SkeletonRow />
            <SkeletonRow />
            <Skeleton shape="text" lines={3} />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-36 w-full !rounded-2xl" />
            <div className="flex gap-2">
              <Skeleton shape="pill" className="h-8 w-20" />
              <Skeleton shape="pill" className="h-8 w-24" />
              <Skeleton shape="circle" className="h-8 w-8" />
            </div>
          </div>
        </Demo>
        <Demo title={t("topProgress")} hint={t("topProgressHint")}>
          <Button variant="tertiary" href="/" size="sm">
            {t("home")}
          </Button>
        </Demo>
      </Section>

      {/* ------------------------------------------------ Data */}
      <Section id="data" title={t("data")}>
        <Demo title={t("cards")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(["surface", "elevated", "glass", "outlined", "sunken"] as const).map((v) => (
            <Card key={v} variant={v}>
              <p className="font-serif text-heading text-primary-900">{t(`card.${v}`)}</p>
              <p className="mt-1 text-meta text-primary-500">{t("cardBody")}</p>
            </Card>
          ))}
          <Card interactive as="article" className="sm:col-span-2 lg:col-span-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-serif text-heading text-primary-900">{t("cardInteractive")}</p>
                <p className="mt-1 text-meta text-primary-500">{t("cardBody")}</p>
              </div>
              <BrandArrowRightIcon size={20} className="shrink-0 text-primary-500 rtl:rotate-180" />
            </div>
          </Card>
        </Demo>
        <Demo title={t("kpis")} className="space-y-4">
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("earnings")} value={kpi.earnings} unit="DZD" delta={{ value: 12.4 }} hint={t("vsLastMonth")} sparkline={[12, 18, 15, 22, 28, 26, 34]} icon={<BrandCashIcon size={18} />} />
            <StatCard label={t("occupancy")} value={kpi.occupancy} unit="%" delta={{ value: -3.1 }} hint={t("vsLastMonth")} sparkline={[80, 82, 79, 75, 77, 74, 78]} icon={<BrandCalendarIcon size={18} />} />
            <StatCard label={t("bookingsKpi")} value={kpi.bookings} delta={{ value: 8 }} hint={t("vsLastMonth")} icon={<BrandUsersIcon size={18} />} />
            <StatCard label={t("cancellations")} value={3} delta={{ value: -40 }} invertDelta hint={t("vsLastMonth")} />
          </div>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() =>
              setKpi({
                earnings: 120000 + Math.round(Math.random() * 120000),
                occupancy: 55 + Math.round(Math.random() * 40),
                bookings: 10 + Math.round(Math.random() * 30),
              })
            }
          >
            {t("randomize")}
          </Button>
        </Demo>
        <Demo title={t("dividers")} className="max-w-xl space-y-6">
          <Divider />
          <Divider label={t("or")} />
          <Divider ornament />
        </Demo>
      </Section>

      {/* ------------------------------------------------ Inputs in use */}
      <Section id="inputs" title={t("inputsInUse")}>
        <div className="grid gap-8 md:grid-cols-2">
          <Demo title={t("counter")} className="block">
            <Card className="w-full">
              <Counter title={t("guestsCounter")} subtitle={t("maxGuests")} value={guests} onChange={setGuests} maxValue={6} />
            </Card>
          </Demo>
          <Demo title={t("calendar")} hint={t("calendarHint")} className="block">
            <Card className="w-full">
              <Calendar value={range} onChange={(v) => setRange(v.selection)} />
            </Card>
          </Demo>
        </div>
      </Section>
    </div>
  );
}
