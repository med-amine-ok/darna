"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { User, PublicUser, Listing, Review } from "@/types";
import { updateProfileAction } from "@/app/actions/account";
import { useActionError } from "@/hook/useActionError";
import { formatDate, formatNumber, formatRating } from "@/lib/i18n/date-locale";
import { imagery } from "@/lib/imagery";
import ListingCard from "@/components/listing/ListingCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  KitEmptyState,
  TabPanel,
  Tabs,
  Textarea,
} from "@/components/ui";
import {
  BrandStarIcon,
  BrandShareIcon,
  BrandShieldIcon,
  BrandCheckIcon,
  BrandGlobeIcon,
  BrandEditIcon,
  BrandCameraIcon,
  BrandPinIcon,
  BrandCalendarIcon,
} from "@/components/icons";
import ProfileHero, { realImage, type ProfileStat } from "./ProfileHero";

/** Owners get their full record; visitors only the public projection (no contact details). */
type ProfileUser = PublicUser & Partial<Pick<User, "email" | "phone" | "address" | "emailVerified">>;

type ProfileTab = "overview" | "edit" | "listings" | "reviews";

interface UserProfileClientProps {
  user: ProfileUser;
  listings: Listing[];
  reviews: Review[];
  isOwner?: boolean;
}

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
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setActiveTab("overview");
      }, 900);
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
  const isHost = user.role === "host";
  const num = (n: number) => formatNumber(n, locale);
  const place = (isOwner && user.address) || t("page.defaultCountry");
  const languagesText = user.languages?.length
    ? new Intl.ListFormat(locale, { type: "conjunction" }).format(user.languages)
    : t("about.notProvided");

  const stats: ProfileStat[] = [
    ...(isHost && typeof user.yearsHosting === "number"
      ? [{ label: t("page.yearsHosting"), value: user.yearsHosting, format: num }]
      : []),
    ...(isHost && typeof user.responseRate === "number"
      ? [
          {
            label: t("page.responseRate"),
            value: user.responseRate,
            format: (n: number) => formatNumber(n / 100, locale, { style: "percent" }),
          },
        ]
      : []),
    ...(isHost
      ? [
          {
            label: t("page.rating"),
            text: hostRating ?? tListing("ratingNew"),
            icon: hostRating ? <BrandStarIcon size={18} className="text-accent-600" aria-hidden="true" /> : undefined,
          },
        ]
      : [{ label: t("page.memberSinceLabel"), text: memberSinceYear }]),
    ...(isHost || listings.length > 0 ? [{ label: t("page.listingsStat"), value: listings.length, format: num }] : []),
    { label: t("page.reviewsStat"), value: reviews.length, format: num },
  ];

  const tabs: { value: ProfileTab; label: string; count?: number }[] = [
    { value: "overview", label: t("tabs.overview") },
    { value: "listings", label: t("page.listingsTabLabel"), count: listings.length },
    { value: "reviews", label: t("page.reviewsTabLabel"), count: reviews.length },
    ...(isOwner ? [{ value: "edit" as const, label: t("editProfile") }] : []),
  ];

  const fieldId = (f: string) => `${formId}-${f}`;
  const tabsId = `${formId}-tabs`;
  const userImage = realImage(user.image);

  return (
    <div className="space-y-10">
      <ProfileHero
        name={user.name}
        eyebrow={isOwner ? t("page.ownerTitle") : isHost ? t("page.roleHost") : t("page.roleTraveler")}
        coverSrc={`${isHost ? imagery.riadCourtyard : imagery.algiersBay}?auto=format&fit=crop&w=1600&q=78`}
        portraitSrc={userImage}
        portraitAlt={t("page.avatarAlt", { name: user.name })}
        portraitAction={
          isOwner ? (
            <IconButton
              label={t("page.changePhoto")}
              variant="secondary"
              size="sm"
              icon={<BrandCameraIcon size={16} />}
              onClick={() => toast.info(t("page.photoChangeSimulated"))}
            />
          ) : undefined
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <BrandCalendarIcon size={14} className="text-secondary-700" aria-hidden="true" />
              {t("page.memberSince", { year: memberSinceYear })}
            </span>
            <span aria-hidden="true" className="text-primary-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <BrandPinIcon size={14} className="text-secondary-700" aria-hidden="true" />
              {place}
            </span>
          </>
        }
        badges={
          user.isIdentityVerified || user.emailVerified ? (
            <>
              {user.isIdentityVerified && (
                <Badge tone="success" icon={<BrandShieldIcon size={13} />}>
                  {isHost ? t("page.verifiedHost") : t("page.verifiedTraveler")}
                </Badge>
              )}
              {user.emailVerified && (
                <Badge tone="olive" icon={<BrandCheckIcon size={13} />}>
                  {t("page.emailConfirmed")}
                </Badge>
              )}
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="tertiary" size="sm" leadingIcon={<BrandShareIcon size={16} />} onClick={handleShare}>
              {t("shareProfile")}
            </Button>
            {isOwner && (
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<BrandEditIcon size={16} />}
                onClick={() => setActiveTab(activeTab === "edit" ? "overview" : "edit")}
                aria-pressed={activeTab === "edit"}
              >
                {activeTab === "edit" ? t("page.viewProfile") : t("editProfile")}
              </Button>
            )}
          </>
        }
        stats={stats}
        statsLabel={t("page.statsLabel")}
      />

      <div>
        <Tabs id={tabsId} items={tabs} value={activeTab} onChange={setActiveTab} ariaLabel={t("page.sectionsLabel")} />

        <div className="mt-8">
          <TabPanel tabsId={tabsId} value="overview" active={activeTab}>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <Card as="section" padding="lg" className="lg:col-span-8" aria-labelledby={fieldId("about")}>
                <h2 id={fieldId("about")} className="font-serif text-heading text-primary-900">
                  {t("about.title")}
                </h2>
                <p className="mt-3 whitespace-pre-line text-body-lg text-primary-700 [text-wrap:pretty]">
                  {user.bio || t("page.defaultBio")}
                </p>
              </Card>

              <Card as="section" padding="lg" variant="sunken" className="lg:col-span-4" aria-labelledby={fieldId("details")}>
                <h2 id={fieldId("details")} className="text-title font-semibold text-primary-900">
                  {t("about.details")}
                </h2>
                <ul className="mt-4 space-y-3.5 text-body text-primary-700">
                  <li className="flex items-start gap-3">
                    <BrandPinIcon size={18} className="mt-0.5 shrink-0 text-secondary-700" aria-hidden="true" />
                    <span>
                      {t.rich("page.livesIn", { place, strong: (chunks) => <strong className="font-semibold text-primary-900">{chunks}</strong> })}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <BrandGlobeIcon size={18} className="mt-0.5 shrink-0 text-secondary-700" aria-hidden="true" />
                    <span>
                      {t.rich("page.speaks", {
                        languages: languagesText,
                        strong: (chunks) => <strong className="font-semibold text-primary-900">{chunks}</strong>,
                      })}
                    </span>
                  </li>
                </ul>

                {(user.isIdentityVerified || user.emailVerified) && (
                  <div className="mt-6 border-t border-primary/[0.08] pt-5">
                    <h3 className="text-eyebrow uppercase font-semibold text-secondary-700">{t("page.confirmedInfo")}</h3>
                    <ul className="mt-3 space-y-2.5 text-body text-primary-700">
                      {user.isIdentityVerified && (
                        <li className="flex items-center gap-2.5">
                          <BrandShieldIcon size={17} className="shrink-0 text-secondary-700" aria-hidden="true" />
                          <span>{t("page.identityVerified")}</span>
                        </li>
                      )}
                      {user.emailVerified && (
                        <li className="flex items-center gap-2.5">
                          <BrandCheckIcon size={17} className="shrink-0 text-secondary-700" aria-hidden="true" />
                          <span>{t("page.emailConfirmed")}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </Card>
            </div>
          </TabPanel>

          <TabPanel tabsId={tabsId} value="listings" active={activeTab}>
            <section aria-labelledby={fieldId("listings")} className="space-y-6">
              <h2 id={fieldId("listings")} className="font-serif text-heading text-primary-900">
                {t("page.listingsBy", { name: user.name })}
              </h2>
              {listings.length === 0 ? (
                <Card padding="none">
                  <KitEmptyState compact variant="search" title={t("page.noListings")} />
                </Card>
              ) : (
                <RevealGroup className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <RevealItem key={listing.id}>
                      <ListingCard data={listing} />
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}
            </section>
          </TabPanel>

          <TabPanel tabsId={tabsId} value="reviews" active={activeTab}>
            <section aria-labelledby={fieldId("reviews")} className="space-y-6">
              <h2 id={fieldId("reviews")} className="font-serif text-heading text-primary-900">
                {t("page.reviewsHeading", { count: reviews.length })}
              </h2>
              {reviews.length === 0 ? (
                <Card padding="none">
                  <KitEmptyState compact variant="messages" title={t("page.noReviews")} />
                </Card>
              ) : (
                <RevealGroup as="ul" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {reviews.map((rev) => {
                    const reviewer = rev.user?.name || t("page.anonymousTraveler");
                    return (
                      <RevealItem as="li" key={rev.id}>
                        <Card as="article" className="h-full">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={reviewer} src={realImage(rev.user?.image)} size="md" decorative />
                              <div>
                                <p className="text-body font-semibold text-primary-900">{reviewer}</p>
                                <time dateTime={rev.createdAt} className="text-meta text-primary-500">
                                  {formatDate(rev.createdAt, locale, { month: "long", year: "numeric" })}
                                </time>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-darnaBg px-2.5 py-1 text-meta font-semibold text-primary-900">
                              <BrandStarIcon size={13} className="text-accent-600" aria-hidden="true" />
                              <span className="sr-only">{t("page.ratingOutOf", { rating: rev.rating })}</span>
                              <span aria-hidden="true" className="tabular-nums">
                                {formatNumber(rev.rating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </span>
                            </span>
                          </div>
                          <p className="mt-4 text-body text-primary-700 [text-wrap:pretty]">{rev.comment}</p>
                        </Card>
                      </RevealItem>
                    );
                  })}
                </RevealGroup>
              )}
            </section>
          </TabPanel>

          {isOwner && (
            <TabPanel tabsId={tabsId} value="edit" active={activeTab}>
              <Reveal>
                <Card as="section" padding="lg" className="max-w-3xl" aria-labelledby={fieldId("edit")}>
                  <h2 id={fieldId("edit")} className="font-serif text-heading text-primary-900">
                    {t("editForm.title")}
                  </h2>
                  <p className="mt-2 text-body text-primary-600">{t("editForm.subtitle")}</p>
                  <form onSubmit={handleSaveProfile} noValidate className="mt-6 space-y-4">
                    <Input
                      id={fieldId("name")}
                      label={t("editForm.fullName")}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("editForm.namePlaceholder")}
                      required
                      error={nameError}
                    />
                    <Textarea
                      id={fieldId("bio")}
                      label={t("editForm.bio")}
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("editForm.bioPlaceholder")}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        id={fieldId("address")}
                        label={t("editForm.location")}
                        autoComplete="address-level1"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t("editForm.locationPlaceholder")}
                      />
                      <Input
                        id={fieldId("phone")}
                        type="tel"
                        label={t("editForm.phone")}
                        autoComplete="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t("editForm.phonePlaceholder")}
                        className="text-start"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setActiveTab("overview")} disabled={isSaving}>
                        {tCommon("cancel")}
                      </Button>
                      <Button type="submit" variant="secondary" loading={isSaving} success={saved}>
                        {isSaving ? t("editForm.saving") : t("editForm.saveButton")}
                      </Button>
                    </div>
                  </form>
                </Card>
              </Reveal>
            </TabPanel>
          )}
        </div>
      </div>
    </div>
  );
}
