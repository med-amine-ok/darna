"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import {
  BrandSearchIcon,
  BrandCalendarIcon,
  BrandUserIcon,
  BrandCreditCardIcon,
  BrandShieldIcon,
  BrandHomeIcon,
  BrandChevronDownIcon,
  BrandThumbUpIcon,
  BrandThumbDownIcon,
  BrandMailIcon,
  BrandPhoneIcon,
} from "@/components/icons";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const inputClass =
  "w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-primary placeholder-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 aria-[invalid=true]:border-status-error";

const ARTICLE_IDS = [
  { id: "art_01", category: "booking" },
  { id: "art_02", category: "payments" },
  { id: "art_03", category: "account" },
  { id: "art_04", category: "safety" },
  { id: "art_05", category: "hosting" },
  { id: "art_06", category: "booking" },
] as const;

const TOPICS = ["booking", "payments", "host", "safety", "other"] as const;

type SupportField = "name" | "email" | "message";

export default function HelpClient() {
  const t = useTranslations("help");
  const formId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>("art_01");
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});

  // Support Form state
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTopic, setSupportTopic] = useState("booking");
  const [supportMessage, setSupportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<SupportField, string>>>({});

  const categories = [
    { id: "all", label: t("categories.all"), icon: BrandSearchIcon },
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
      toast.success(t("form.sent"));
      setSupportMessage("");
    }, 500);
  };

  const fieldId = (f: string) => `${formId}-${f}`;
  const errorProps = (f: SupportField) =>
    errors[f] ? { "aria-invalid": true as const, "aria-describedby": fieldId(`${f}-error`) } : {};
  const renderError = (f: SupportField) =>
    errors[f] ? (
      <p id={fieldId(`${f}-error`)} className="mt-1 text-status-error">
        {errors[f]}
      </p>
    ) : null;

  return (
    <div className="space-y-12">
      {/* Hero Search Section */}
      <div className="bg-primary text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-lg">
        <div className="max-w-2xl mx-auto space-y-4 relative z-10">
          <p className="text-xs uppercase tracking-widest text-tertiary font-bold">{t("eyebrow")}</p>
          <h1 className="text-2xl sm:text-4xl font-bold font-serif">{t("heroTitle")}</h1>
          <p className="text-xs sm:text-sm text-neutral-300">{t("heroSubtitle")}</p>

          {/* Search Box */}
          <div className="relative pt-4 max-w-lg mx-auto" role="search">
            <label htmlFor={fieldId("search")} className="sr-only">
              {t("searchLabel")}
            </label>
            <BrandSearchIcon
              size={20}
              className="absolute start-4.5 top-[27px] text-neutral-500"
              aria-hidden="true"
            />
            <input
              id={fieldId("search")}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-12 pe-4 py-3.5 bg-white text-primary rounded-2xl text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:ring-4 focus:ring-accent/40 shadow-md"
            />
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div aria-hidden="true" className="absolute -top-12 -start-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -bottom-12 -end-12 w-64 h-64 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Category Tabs */}
      <div
        role="group"
        aria-label={t("categoriesLabel")}
        className="flex items-center gap-2 overflow-x-auto p-1 pb-2 scrollbar-none"
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition border ${focusRing} ${
                isActive
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-white text-neutral-700 border-tertiary/70 hover:bg-neutral-50"
              }`}
            >
              <Icon size={16} className={isActive ? "text-white" : "text-secondary"} aria-hidden="true" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Articles Accordion */}
      <section className="space-y-4" aria-labelledby={fieldId("faq")}>
        <div className="flex items-center justify-between">
          <h2 id={fieldId("faq")} className="text-xl font-bold text-primary font-serif">
            {t("faqTitle")}
          </h2>
          <span className="text-xs text-neutral-500" aria-live="polite">
            {t("articleCount", { count: filteredArticles.length })}
          </span>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-tertiary text-center text-xs text-neutral-500 shadow-xs">
            {t("noResults", { query: searchQuery })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((art) => {
              const isExpanded = expandedArticleId === art.id;
              const panelId = fieldId(`${art.id}-panel`);

              return (
                <div
                  key={art.id}
                  className="bg-white rounded-2xl border border-tertiary overflow-hidden shadow-xs transition"
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                      className={`w-full p-5 text-start flex items-center justify-between gap-4 hover:bg-neutral-50 transition ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0 rounded-2xl`}
                    >
                      <span>
                        <span className="block font-bold text-primary text-sm sm:text-base">{art.title}</span>
                        {!isExpanded && (
                          <span className="block text-xs text-neutral-500 mt-0.5 line-clamp-1">{art.snippet}</span>
                        )}
                      </span>
                      <BrandChevronDownIcon
                        size={20}
                        aria-hidden="true"
                        className={`text-neutral-400 transition-transform shrink-0 ${
                          isExpanded ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                  </h3>

                  {isExpanded && (
                    <div id={panelId} className="px-5 pb-5 pt-1 border-t border-tertiary/30 space-y-4">
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{art.content}</p>

                      {/* "Was this helpful?" Widget */}
                      <div
                        role="group"
                        aria-labelledby={fieldId(`${art.id}-helpful`)}
                        className="flex items-center justify-between pt-3 border-t border-tertiary/30 text-xs text-neutral-500"
                      >
                        <span id={fieldId(`${art.id}-helpful`)}>{t("helpful")}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-pressed={feedback[art.id] === "yes"}
                            onClick={() => handleFeedback(art.id, "yes")}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 transition ${focusRing} ${
                              feedback[art.id] === "yes"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                : "border-tertiary hover:bg-neutral-50 text-neutral-600"
                            }`}
                          >
                            <BrandThumbUpIcon size={15} aria-hidden="true" />
                            <span>{t("helpfulYes")}</span>
                          </button>
                          <button
                            type="button"
                            aria-pressed={feedback[art.id] === "no"}
                            onClick={() => handleFeedback(art.id, "no")}
                            className={`p-1.5 rounded-lg border flex items-center gap-1 transition ${focusRing} ${
                              feedback[art.id] === "no"
                                ? "bg-rose-50 border-rose-300 text-rose-800"
                                : "border-tertiary hover:bg-neutral-50 text-neutral-600"
                            }`}
                          >
                            <BrandThumbDownIcon size={15} aria-hidden="true" />
                            <span>{t("helpfulNo")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Contact Support Form & Emergency Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Contact Form */}
        <section
          aria-labelledby={fieldId("contact")}
          className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-4"
        >
          <div>
            <h2 id={fieldId("contact")} className="text-xl font-bold text-primary font-serif">
              {t("form.title")}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">{t("form.subtitle")}</p>
          </div>

          <form onSubmit={handleSupportSubmit} noValidate className="space-y-4 text-xs">
            {Object.keys(errors).length > 0 && (
              <p role="alert" className="rounded-xl border border-status-error/40 bg-rose-50 p-3 text-status-error">
                {t("form.fixErrors")}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={fieldId("name")} className="block font-semibold text-neutral-700 mb-1">
                  {t("form.name")}
                </label>
                <input
                  id={fieldId("name")}
                  type="text"
                  autoComplete="name"
                  value={supportName}
                  onChange={(e) => setSupportName(e.target.value)}
                  placeholder={t("form.namePlaceholder")}
                  required
                  className={inputClass}
                  {...errorProps("name")}
                />
                {renderError("name")}
              </div>
              <div>
                <label htmlFor={fieldId("email")} className="block font-semibold text-neutral-700 mb-1">
                  {t("form.email")}
                </label>
                <input
                  id={fieldId("email")}
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder={t("form.emailPlaceholder")}
                  required
                  className={`${inputClass} text-start`}
                  {...errorProps("email")}
                />
                {renderError("email")}
              </div>
            </div>

            <div>
              <label htmlFor={fieldId("topic")} className="block font-semibold text-neutral-700 mb-1">
                {t("form.topic")}
              </label>
              <select
                id={fieldId("topic")}
                value={supportTopic}
                onChange={(e) => setSupportTopic(e.target.value)}
                className={inputClass}
              >
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {t(`form.topics.${topic}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={fieldId("message")} className="block font-semibold text-neutral-700 mb-1">
                {t("form.message")}
              </label>
              <textarea
                id={fieldId("message")}
                rows={4}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder={t("form.messagePlaceholder")}
                required
                className={inputClass}
                {...errorProps("message")}
              />
              {renderError("message")}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/95 transition shadow-xs disabled:opacity-50 ${focusRing}`}
            >
              {isSubmitting ? t("form.sending") : t("form.submit")}
            </button>
          </form>
        </section>

        {/* Direct Channels Card */}
        <section
          aria-labelledby={fieldId("channels")}
          className="lg:col-span-4 bg-tertiary/20 rounded-3xl p-6 sm:p-8 border border-tertiary/60 space-y-5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <h2 id={fieldId("channels")} className="font-bold text-primary font-serif text-base">
              {t("channels.title")}
            </h2>
            <div className="space-y-3 text-xs text-neutral-700">
              <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-tertiary/60">
                <BrandPhoneIcon size={20} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-primary">{t("channels.hotline")}</div>
                  <a
                    href="tel:+21321000000"
                    dir="ltr"
                    className={`inline-block text-neutral-600 mt-0.5 hover:underline rounded ${focusRing}`}
                  >
                    +213 21 00 00 00
                  </a>
                  <div className="text-[11px] text-neutral-500">{t("channels.hotlineHours")}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-tertiary/60">
                <BrandMailIcon size={20} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-primary">{t("channels.email")}</div>
                  <a
                    href="mailto:support@darna.dz"
                    dir="ltr"
                    className={`inline-block text-neutral-600 mt-0.5 hover:underline rounded ${focusRing}`}
                  >
                    support@darna.dz
                  </a>
                  <div className="text-[11px] text-neutral-500">{t("channels.emailResponse")}</div>
                </div>
              </div>
            </div>
          </div>

          <p className="p-3 bg-white/70 rounded-2xl border border-tertiary/50 text-[11px] text-neutral-600">
            {t.rich("channels.urgentNote", {
              strong: (chunks) => <span className="font-bold text-primary">{chunks}</span>,
            })}
          </p>
        </section>
      </div>
    </div>
  );
}
