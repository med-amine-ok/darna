"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { User, PublicUser, Listing, Review } from "@/types";
import { updateProfileAction } from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { formatDate, formatNumber, formatRating } from "@/lib/i18n/date-locale";
import ListingCard from "@/components/listing/ListingCard";
import Avatar from "@/components/Avatar";
import { toast } from "react-toastify";
import {
  BrandStarIcon,
  BrandShareIcon,
  BrandShieldIcon,
  BrandCheckIcon,
  BrandGlobeIcon,
  BrandEditIcon,
  BrandCameraIcon,
  BrandPinIcon,
} from "@/components/icons";

/** Owners get their full record; visitors only the public projection (no contact details). */
type ProfileUser = PublicUser & Partial<Pick<User, "email" | "phone" | "address" | "emailVerified">>;

type ProfileTab = "overview" | "edit" | "listings" | "reviews";

interface UserProfileClientProps {
  user: ProfileUser;
  listings: Listing[];
  reviews: Review[];
  isOwner?: boolean;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const inputClass =
  "w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary placeholder-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 aria-[invalid=true]:border-status-error";


export default function UserProfileClient({
  user: initialUser,
  listings,
  reviews,
  isOwner = false,
}: UserProfileClientProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tListing = useTranslations("listing");
  const errorText = useActionError();
  const locale = useLocale();
  const formId = useId();
  const [user, setUser] = useState<ProfileUser>(initialUser);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  // Edit form state
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [address, setAddress] = useState(user.address || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(t("page.nameRequired"));
      return;
    }
    setNameError(null);
    setIsSaving(true);
    try {
      const result = await updateProfileAction({ name, bio, address, phone, languages: user.languages });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setUser(result.data);
      toast.success(t("editForm.saveSuccess"));
      setActiveTab("overview");
    } catch {
      toast.error(t("page.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.info(t("copied"));
    } catch {
      toast.error(t("page.copyFailed"));
    }
  };

  // Review-weighted average of the host's listing ratings; null → "New".
  const ratedListings = listings.filter((l) => l.rating && l.rating > 0);
  const ratingWeight = ratedListings.reduce((sum, l) => sum + (l.reviewCount || 1), 0);
  const hostRating = ratingWeight
    ? formatRating(ratedListings.reduce((sum, l) => sum + (l.rating || 0) * (l.reviewCount || 1), 0) / ratingWeight, locale)
    : null;

  const memberSinceYear = formatDate(user.createdAt, locale, { year: "numeric" });
  const roleLabel = user.role === "host" ? t("page.verifiedHost") : t("page.verifiedTraveler");

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "overview", label: t("tabs.overview") },
    { id: "listings", label: t("page.listingsTab", { count: listings.length }) },
    { id: "reviews", label: t("page.reviewsTab", { count: reviews.length }) },
    ...(isOwner ? [{ id: "edit" as const, label: t("editProfile") }] : []),
  ];

  const fieldId = (f: string) => `${formId}-${f}`;

  return (
    <div className="space-y-8">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            {isOwner ? t("page.ownerTitle") : t("page.visitorTitle", { name: user.name })}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isOwner ? t("page.ownerSubtitle") : t("page.visitorSubtitle", { year: memberSinceYear })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className={`inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-xs ${focusRing}`}
          >
            <BrandShareIcon size={16} aria-hidden="true" />
            <span>{t("shareProfile")}</span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "edit" ? "overview" : "edit")}
              aria-pressed={activeTab === "edit"}
              className={`inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-xs ${focusRing}`}
            >
              <BrandEditIcon size={16} aria-hidden="true" />
              <span>{activeTab === "edit" ? t("page.viewProfile") : t("editProfile")}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Start column: Avatar & Trust Card */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm text-center">
            <div className="relative inline-block mx-auto mb-4">
              <Avatar src={user.image} size={110} alt={t("page.avatarAlt", { name: user.name })} />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => toast.info(t("page.photoChangeSimulated"))}
                  className={`absolute bottom-1 end-1 p-2 bg-primary text-white rounded-full shadow-md hover:bg-primary/90 transition ${focusRing}`}
                  aria-label={t("page.changePhoto")}
                  title={t("page.changePhoto")}
                >
                  <BrandCameraIcon size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            <h2 className="text-xl font-bold text-primary font-serif">{user.name}</h2>
            <div className="text-xs text-neutral-500 mt-1">{roleLabel}</div>

            {/* Verification badges: only what the account record actually confirms */}
            {(user.isIdentityVerified || user.emailVerified) && (
              <div className="my-6 p-4 bg-tertiary/20 rounded-2xl border border-tertiary/40 text-start space-y-2.5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">{t("page.confirmedInfo")}</h3>
                <ul className="space-y-2.5">
                  {user.isIdentityVerified && (
                    <li className="flex items-center gap-2 text-xs text-neutral-700">
                      <BrandShieldIcon size={16} className="text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>{t("page.identityVerified")}</span>
                    </li>
                  )}
                  {user.emailVerified && (
                    <li className="flex items-center gap-2 text-xs text-neutral-700">
                      <BrandCheckIcon size={16} className="text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>{t("page.emailConfirmed")}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Host stats (from the user record and their listings' real ratings) */}
            {user.role === "host" && (
              <dl className="pt-4 border-t border-tertiary/50 grid grid-cols-3 gap-2 text-center">
                {typeof user.yearsHosting === "number" && (
                  <div className="flex flex-col-reverse">
                    <dt className="text-[11px] text-neutral-500">{t("page.yearsHosting")}</dt>
                    <dd className="text-lg font-bold text-primary">{formatNumber(user.yearsHosting, locale)}</dd>
                  </div>
                )}
                {typeof user.responseRate === "number" && (
                  <div className="flex flex-col-reverse">
                    <dt className="text-[11px] text-neutral-500">{t("page.responseRate")}</dt>
                    <dd className="text-lg font-bold text-primary">
                      {formatNumber(user.responseRate / 100, locale, { style: "percent" })}
                    </dd>
                  </div>
                )}
                <div className="flex flex-col-reverse">
                  <dt className="text-[11px] text-neutral-500">{t("page.rating")}</dt>
                  <dd className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                    {hostRating ? (
                      <>
                        <BrandStarIcon size={16} className="text-accent" aria-hidden="true" />
                        <span>{hostRating}</span>
                      </>
                    ) : (
                      tListing("ratingNew")
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {/* Quick Info Block */}
          <section className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-3.5 text-xs text-neutral-700">
            <h2 className="font-bold text-primary text-sm">{t("about.details")}</h2>
            <div className="flex items-center gap-2">
              <BrandPinIcon size={16} className="text-secondary shrink-0" aria-hidden="true" />
              <span>
                {t.rich("page.livesIn", {
                  place: (isOwner && user.address) || t("page.defaultCountry"),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BrandGlobeIcon size={16} className="text-secondary shrink-0" aria-hidden="true" />
              <span>
                {t.rich("page.speaks", {
                  languages: user.languages?.length
                    ? new Intl.ListFormat(locale, { type: "conjunction" }).format(user.languages)
                    : t("about.notProvided"),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </span>
            </div>
          </section>
        </div>

        {/* End column: Content Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs Navigation */}
          <div
            role="group"
            aria-label={t("page.sectionsLabel")}
            className="flex flex-wrap items-center gap-2 border-b border-tertiary/50 pb-2"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${focusRing} ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-neutral-600 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: Overview & Passport */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* About Me */}
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-3">
                <h2 className="text-lg font-bold text-primary font-serif">{t("about.title")}</h2>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                  {user.bio || t("page.defaultBio")}
                </p>
              </section>
            </div>
          )}

          {/* TAB: Listings */}
          {activeTab === "listings" && (
            <section className="space-y-4">
              <h2 className="text-base font-bold text-primary">{t("page.listingsBy", { name: user.name })}</h2>
              {listings.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-tertiary text-center text-xs text-neutral-500">
                  {t("page.noListings")}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} data={listing} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB: Reviews */}
          {activeTab === "reviews" && (
            <section className="space-y-4">
              <h2 className="text-base font-bold text-primary">
                {t("page.reviewsHeading", { count: reviews.length })}
              </h2>
              {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-tertiary text-center text-xs text-neutral-500">
                  {t("page.noReviews")}
                </div>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((rev) => (
                    <li key={rev.id} className="bg-white rounded-2xl border border-tertiary p-5 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={rev.user?.image} size={36} />
                          <div>
                            <div className="text-xs font-bold text-primary">
                              {rev.user?.name || t("page.anonymousTraveler")}
                            </div>
                            <time dateTime={rev.createdAt} className="text-[11px] text-neutral-500">
                              {formatDate(rev.createdAt, locale)}
                            </time>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-primary">
                          <BrandStarIcon size={14} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                          <span className="sr-only">{t("page.ratingOutOf", { rating: rev.rating })}</span>
                          <span aria-hidden="true">
                            {formatNumber(rev.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">{rev.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* TAB: Edit Profile Form */}
          {activeTab === "edit" && isOwner && (
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm">
              <h2 className="text-lg font-bold text-primary font-serif mb-4">{t("editForm.title")}</h2>
              <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
                <div>
                  <label htmlFor={fieldId("name")} className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    {t("editForm.fullName")}
                  </label>
                  <input
                    id={fieldId("name")}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("editForm.namePlaceholder")}
                    required
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError ? fieldId("name-error") : undefined}
                    className={inputClass}
                  />
                  {nameError && (
                    <p id={fieldId("name-error")} role="alert" className="mt-1 text-xs text-status-error">
                      {nameError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={fieldId("bio")} className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    {t("editForm.bio")}
                  </label>
                  <textarea
                    id={fieldId("bio")}
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("editForm.bioPlaceholder")}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={fieldId("address")}
                      className="block text-xs font-semibold text-neutral-700 mb-1.5"
                    >
                      {t("editForm.location")}
                    </label>
                    <input
                      id={fieldId("address")}
                      type="text"
                      autoComplete="address-level1"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t("editForm.locationPlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId("phone")} className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      {t("editForm.phone")}
                    </label>
                    <input
                      id={fieldId("phone")}
                      type="tel"
                      autoComplete="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("editForm.phonePlaceholder")}
                      className={`${inputClass} text-start`}
                    />
                  </div>
                </div>


                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition ${focusRing}`}
                  >
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-6 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-sm disabled:opacity-50 ${focusRing}`}
                  >
                    {isSaving ? t("editForm.saving") : t("editForm.saveButton")}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
