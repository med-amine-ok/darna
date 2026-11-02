"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { AnimatePresence, m } from "framer-motion";
import {
  BrandSearchIcon,
  BrandCalendarIcon,
  BrandUserIcon,
  BrandCreditCardIcon,
  BrandShieldIcon,
  BrandHomeIcon,
  BrandThumbUpIcon,
  BrandThumbDownIcon,
  BrandMailIcon,
  BrandPhoneIcon,
  BrandMessageIcon,
  BrandSendIcon,
  BrandGridIcon,
} from "@/components/icons";
import { Accordion, Banner, Button, Input, KitEmptyState, Select, Textarea, cn, focusRing } from "@/components/ui";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Link } from "@/navigation";
import { dur, ease } from "@/lib/motion";

const ARTICLE_IDS = [
  { id: "art_01", category: "booking" },
  { id: "art_02", category: "payments" },
  { id: "art_03", category: "account" },
  { id: "art_04", category: "safety" },
  { id: "art_05", category: "hosting" },
  { id: "art_06", category: "booking" },
] as const;

const TOPICS = ["booking", "payments", "host", "safety", "other"] as const;

/** Support contacts (the same published numbers as before; no WhatsApp line exists yet). */
const SUPPORT_PHONE_HREF = "tel:+21321000000";
const SUPPORT_PHONE_LABEL = "+213 21 00 00 00";
const SUPPORT_EMAIL = "support@bladus.dz";

type SupportField = "name" | "email" | "message";

function Eyebrow({ children, tone = "olive" }: { children: React.ReactNode; tone?: "olive" | "light" }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-eyebrow uppercase font-semibold",
        tone === "light" ? "text-tertiary-200" : "text-secondary-700"
      )}
    >
      <span aria-hidden="true" className={cn("h-px w-6", tone === "light" ? "bg-tertiary-300/60" : "bg-secondary-600/60")} />
      {children}
    </p>
  );
}

export default function HelpClient() {
  const t = useTranslations("help");
  const formId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});

  // Support form state
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTopic, setSupportTopic] = useState("booking");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<SupportField, string>>>({});

  const categories = [
    { id: "all", label: t("categories.all"), icon: BrandGridIcon },
    { id: "booking", label: t("categories.booking"), icon: BrandCalendarIcon },
    { id: "account", label: t("categories.account"), icon: BrandUserIcon },
    { id: "payments", label: t("categories.payments"), icon: BrandCreditCardIcon },
    { id: "safety", label: t("categories.safety"), icon: BrandShieldIcon },
    { id: "hosting", label: t("categories.hosting"), icon: BrandHomeIcon },
  ];

  const articles = ARTICLE_IDS.map(({ id, category }) => ({
    id,
    category,
    title: t(`articles.${id}.title`),
    snippet: t(`articles.${id}.snippet`),
    content: t(`articles.${id}.content`),
  }));

  const countFor = (cat: string) => (cat === "all" ? articles.length : articles.filter((a) => a.category === cat).length);

  const filteredArticles = articles.filter((a) => {
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLocaleLowerCase();
      return a.title.toLocaleLowerCase().includes(q) || a.content.toLocaleLowerCase().includes(q);
    }
    return true;
  });

  const handleFeedback = (artId: string, val: "yes" | "no") => {
    setFeedback((prev) => ({ ...prev, [artId]: val }));
    toast.success(t("feedbackThanks"));
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<SupportField, string>> = {};
    if (!supportName.trim()) nextErrors.name = t("form.nameRequired");
    if (!supportEmail.trim()) nextErrors.email = t("form.emailRequired");
    if (!supportMessage.trim()) nextErrors.message = t("form.messageRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSent(true);
      toast.success(t("form.sent"));
      setSupportMessage("");
      setTimeout(() => setSent(false), 2200);
    }, 500);
  };

  const fieldId = (f: string) => `${formId}-${f}`;

  const accordionItems = filteredArticles.map((art) => {
    const vote = feedback[art.id];
    return {
      id: art.id,
      title: art.title,
      subtitle: art.snippet,
      content: (
        <div className="space-y-4">
          <p className="text-body text-primary-700 [text-wrap:pretty]">{art.content}</p>
          <div
            role="group"
            aria-labelledby={fieldId(`${art.id}-helpful`)}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/[0.08] pt-4"
          >
            <span id={fieldId(`${art.id}-helpful`)} className="text-meta text-primary-600">
              {t("helpful")}
            </span>
            <div className="flex items-center gap-2">
              {(["yes", "no"] as const).map((val) => {
                const Icon = val === "yes" ? BrandThumbUpIcon : BrandThumbDownIcon;
                const active = vote === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleFeedback(art.id, val)}
                    className={cn(
                      "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-meta font-semibold",
                      "transition-[background-color,color,box-shadow] duration-fast ease-standard",
                      focusRing,
                      active
                        ? val === "yes"
                          ? "bg-secondary-100 text-secondary-800 ring-1 ring-secondary-300"
                          : "bg-accent-100 text-accent-800 ring-1 ring-accent-200"
                        : "bg-white text-primary-700 shadow-e1 hover:shadow-e2"
                    )}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>{val === "yes" ? t("helpfulYes") : t("helpfulNo")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero search band */}
      <section
        aria-labelledby={fieldId("title")}
        className="relative isolate overflow-hidden rounded-3xl bg-primary-800 px-5 py-12 text-white shadow-e3 sm:px-10 sm:py-16 lg:py-20"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10 texture-zellige opacity-60 invert" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(201,111,79,0.28),transparent_60%)]"
        />
        <div className="mx-auto max-w-2xl text-center">
          <div className="enter-up flex justify-center">
            <Eyebrow tone="light">{t("eyebrow")}</Eyebrow>
          </div>
          <h1
            id={fieldId("title")}
            className="enter-up mt-4 font-serif text-display-lg text-white [text-wrap:balance]"
            style={{ animationDelay: "60ms" }}
          >
            {t("heroTitle")}
          </h1>
          <p className="enter-up mx-auto mt-4 max-w-[52ch] text-body-lg text-white/80" style={{ animationDelay: "120ms" }}>
            {t("heroSubtitle")}
          </p>

          <div role="search" className="enter-up mx-auto mt-8 max-w-xl text-start" style={{ animationDelay: "180ms" }}>
            <Input
              id={fieldId("search")}
              type="search"
              label={t("searchLabel")}
              hideLabel
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              prefix={<BrandSearchIcon size={20} aria-hidden="true" />}
              containerClassName="[&_.field-control]:shadow-e3"
            />
          </div>
        </div>
      </section>

      {/* Category cards */}
      <section aria-labelledby={fieldId("topics")} className="space-y-6">
        <Reveal as="header">
          <Eyebrow>{t("browseEyebrow")}</Eyebrow>
          <h2 id={fieldId("topics")} className="mt-3 font-serif text-display-md text-primary-900">
            {t("browseTitle")}
          </h2>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <RevealItem key={cat.id}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "group relative flex h-full min-h-[8.5rem] w-full flex-col justify-between gap-4 rounded-2xl p-4 text-start sm:p-5",
                    "transition-[transform,box-shadow,background-color] duration-base ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                    focusRing,
                    "focus-visible:ring-offset-darnaBg",
                    isActive ? "bg-primary-800 text-white shadow-e3" : "bg-white text-primary-900 shadow-e1 hover:shadow-e2"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-fast ease-standard",
                      isActive ? "bg-white/15 text-tertiary-100" : "bg-secondary-50 text-secondary-700"
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="block text-meta font-semibold leading-snug sm:text-body">{cat.label}</span>
                    <span className={cn("mt-1 block text-meta", isActive ? "text-white/70" : "text-primary-500")}>
                      {t("articleCount", { count: countFor(cat.id) })}
                    </span>
                  </span>
                </button>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* FAQ accordion */}
      <section className="space-y-6" aria-labelledby={fieldId("faq")}>
        <Reveal as="header" className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>{t("faqEyebrow")}</Eyebrow>
            <h2 id={fieldId("faq")} className="mt-3 font-serif text-display-md text-primary-900">
              {t("faqTitle")}
            </h2>
          </div>
          <span className="text-meta text-primary-600" aria-live="polite">
            {t("articleCount", { count: filteredArticles.length })}
          </span>
        </Reveal>

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={`${activeCategory}|${searchQuery.trim() ? "q" : ""}${filteredArticles.length}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: dur.fast, ease: ease.out }}
          >
            {filteredArticles.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-e1">
                <KitEmptyState
                  compact
                  variant="search"
                  title={t("noResultsTitle")}
                  description={t("noResults", { query: searchQuery })}
                  action={
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory("all");
                      }}
                    >
                      {t("clearSearch")}
                    </Button>
                  }
                />
              </div>
            ) : (
              <Accordion items={accordionItems} defaultOpen={["art_01"]} headingLevel={3} />
            )}
          </m.div>
        </AnimatePresence>
      </section>

      {/* Contact */}
      <section aria-labelledby={fieldId("contact")} className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <Reveal className="rounded-3xl bg-white p-6 shadow-e1 sm:p-8 lg:col-span-8">
          <Eyebrow>{t("contactEyebrow")}</Eyebrow>
          <h2 id={fieldId("contact")} className="mt-3 font-serif text-heading text-primary-900">
            {t("form.title")}
          </h2>
          <p className="mt-2 max-w-[60ch] text-body text-primary-600">{t("form.subtitle")}</p>

          <form onSubmit={handleSupportSubmit} noValidate className="mt-6 space-y-4">
            {Object.keys(errors).length > 0 && <Banner tone="danger">{t("form.fixErrors")}</Banner>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id={fieldId("name")}
                label={t("form.name")}
                autoComplete="name"
                value={supportName}
                onChange={(e) => setSupportName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                required
                error={errors.name}
              />
              <Input
                id={fieldId("email")}
                type="email"
                label={t("form.email")}
                autoComplete="email"
                dir="ltr"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder={t("form.emailPlaceholder")}
                required
                error={errors.email}
                className="text-start"
              />
            </div>
            <Select
              id={fieldId("topic")}
              label={t("form.topic")}
              value={supportTopic}
              onChange={(e) => setSupportTopic(e.target.value)}
              options={TOPICS.map((topic) => ({ value: topic, label: t(`form.topics.${topic}`) }))}
            />
            <Textarea
              id={fieldId("message")}
              label={t("form.message")}
              rows={5}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder={t("form.messagePlaceholder")}
              required
              error={errors.message}
            />
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                loading={isSubmitting}
                success={sent}
                trailingIcon={<BrandSendIcon size={16} className="rtl:-scale-x-100" aria-hidden="true" />}
              >
                {isSubmitting ? t("form.sending") : t("form.submit")}
              </Button>
            </div>
          </form>
        </Reveal>

        <Reveal as="aside" delay={0.08} className="lg:col-span-4">
          <div className="relative h-full overflow-hidden rounded-3xl bg-darnaBg-300/70 p-6 sm:p-8">
            <div aria-hidden="true" className="absolute -top-10 -end-10 h-36 w-36 rounded-full texture-zellige opacity-80" />
            <h2 className="relative font-serif text-heading text-primary-900">{t("channels.title")}</h2>
            <ul className="relative mt-5 space-y-3">
              <li>
                <a
                  href={SUPPORT_PHONE_HREF}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl bg-white p-4 shadow-e1 transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:shadow-e2 motion-reduce:hover:translate-y-0",
                    focusRing
                  )}
                >
                  <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-700">
                    <BrandPhoneIcon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-meta font-semibold text-primary-600">{t("channels.hotline")}</span>
                    <span dir="ltr" className="mt-0.5 block text-body font-semibold text-primary-900 tabular-nums">
                      {SUPPORT_PHONE_LABEL}
                    </span>
                    <span className="mt-0.5 block text-meta text-primary-500">{t("channels.hotlineHours")}</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl bg-white p-4 shadow-e1 transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:shadow-e2 motion-reduce:hover:translate-y-0",
                    focusRing
                  )}
                >
                  <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-700">
                    <BrandMailIcon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-meta font-semibold text-primary-600">{t("channels.email")}</span>
                    <span dir="ltr" className="mt-0.5 block truncate text-body font-semibold text-primary-900">
                      {SUPPORT_EMAIL}
                    </span>
                    <span className="mt-0.5 block text-meta text-primary-500">{t("channels.emailResponse")}</span>
                  </span>
                </a>
              </li>
            </ul>
            <div className="relative mt-5 flex items-start gap-3 rounded-2xl bg-white/70 p-4 text-meta text-primary-700">
              <BrandMessageIcon size={18} className="mt-0.5 shrink-0 text-accent-600" aria-hidden="true" />
              <p>
                {t.rich("channels.urgentNote", {
                  strong: (chunks) => (
                    <Link href="/messages" className={cn("font-semibold text-primary-900 link-underline rounded", focusRing)}>
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
