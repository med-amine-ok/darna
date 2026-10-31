"use client";

/**
 * Editorial profile header shared by member profiles (/profile, /users/[id]) and public
 * agency pages (/agencies/[id]): an Algerian landscape cover, an arch-masked portrait
 * that overlaps it, serif name, optional badges and actions, and a stats row whose
 * numbers tween with AnimatedNumber. Everything is in the server HTML (CSS entrances only).
 */

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatedNumber, cn } from "@/components/ui";

/** The seeded placeholder files are not real photos: show initials / a monogram instead. */
const PLACEHOLDER_IMAGES = ["/assets/avatar.png", "/assets/logo-vertical.png", "/assets/logo-horizontal.png"];

export function realImage(src?: string | null): string | null {
  if (!src) return null;
  return PLACEHOLDER_IMAGES.some((p) => src.endsWith(p)) ? null : src;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export interface ProfileStat {
  label: string;
  /** Numeric stats tween; pass `text` instead for values like "4.94" or "New". */
  value?: number;
  format?: (n: number) => string;
  text?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface ProfileHeroProps {
  name: string;
  /** Short line above the name (role, category). */
  eyebrow?: React.ReactNode;
  /** Muted line under the name (member since, location). */
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  coverSrc: string;
  portraitSrc?: string | null;
  portraitAlt?: string;
  /** Overlay control on the portrait (e.g. change photo). */
  portraitAction?: React.ReactNode;
  /** "contain" for logos. */
  portraitFit?: "cover" | "contain";
  stats?: ProfileStat[];
  statsLabel?: string;
  children?: React.ReactNode;
}

export default function ProfileHero({
  name,
  eyebrow,
  meta,
  badges,
  actions,
  coverSrc,
  portraitSrc,
  portraitAlt = "",
  portraitAction,
  portraitFit = "cover",
  stats,
  statsLabel,
  children,
}: ProfileHeroProps) {
  const [coverLoaded, setCoverLoaded] = useState(false);
  const coverRef = useRef<HTMLImageElement>(null);
  // The priority cover can finish loading before hydration, when React's onLoad is not
  // attached yet: check the element and listen natively as well.
  useEffect(() => {
    const img = coverRef.current;
    if (!img) return;
    const done = () => setCoverLoaded(true);
    if (img.complete && img.naturalWidth > 0) done();
    img.addEventListener("load", done);
    return () => img.removeEventListener("load", done);
  }, []);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const showPortrait = Boolean(portraitSrc) && !portraitFailed;

  return (
    <section className="enter-lift relative overflow-hidden rounded-3xl bg-white shadow-e1">
      {/* Cover */}
      <div className="relative h-36 overflow-hidden bg-tertiary-100 sm:h-48 lg:h-56">
        <Image
          src={coverSrc}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          ref={coverRef}
          onLoad={() => setCoverLoaded(true)}
          className={cn(
            "object-cover object-center transition-opacity duration-slow ease-out",
            coverLoaded ? "opacity-100" : "opacity-0"
          )}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary-900/45 via-primary-900/10 to-transparent" />
      </div>

      <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            {/* Arch portrait: white frame + inner arch, overlapping the cover */}
            <div
              className="enter-pop relative -mt-20 w-28 shrink-0 sm:-mt-24 sm:w-36"
              style={{ animationDelay: "120ms", filter: "drop-shadow(0 14px 22px rgba(30,38,31,0.18)) drop-shadow(0 2px 4px rgba(30,38,31,0.08))" }}
            >
              <div className="relative aspect-[4/5] w-full mask-arch bg-white">
                <div
                  className={cn(
                    "absolute inset-[5px] mask-arch flex items-center justify-center overflow-hidden",
                    showPortrait ? (portraitFit === "contain" ? "bg-darnaBg" : "bg-tertiary-200") : "bg-secondary-100"
                  )}
                >
                  {showPortrait ? (
                    <Image
                      src={portraitSrc as string}
                      alt={portraitAlt}
                      fill
                      sizes="144px"
                      onError={() => setPortraitFailed(true)}
                      className={portraitFit === "contain" ? "object-contain p-4" : "object-cover"}
                    />
                  ) : (
                    <span
                      role={portraitAlt ? "img" : undefined}
                      aria-label={portraitAlt || undefined}
                      aria-hidden={portraitAlt ? undefined : true}
                      className="mt-4 font-serif text-display-md text-secondary-800"
                    >
                      {initialsOf(name)}
                    </span>
                  )}
                </div>
              </div>
              {portraitAction && <div className="absolute bottom-1 end-0">{portraitAction}</div>}
            </div>

            <div className="min-w-0 pb-1 sm:pt-5">
              {eyebrow && (
                <p className="enter-up flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700" style={{ animationDelay: "80ms" }}>
                  <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
                  {eyebrow}
                </p>
              )}
              <h1
                className="enter-lift mt-2 font-serif text-display-md text-primary-900 [text-wrap:balance]"
                style={{ animationDelay: "140ms" }}
              >
                {name}
              </h1>
              {meta && (
                <div className="enter-up mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-primary-600" style={{ animationDelay: "180ms" }}>
                  {meta}
                </div>
              )}
              {badges && (
                <div className="enter-up mt-3 flex flex-wrap items-center gap-2" style={{ animationDelay: "220ms" }}>
                  {badges}
                </div>
              )}
            </div>
          </div>

          {actions && (
            <div className="enter-up flex shrink-0 flex-wrap items-center gap-2.5" style={{ animationDelay: "240ms" }}>
              {actions}
            </div>
          )}
        </div>

        {children}

        {stats && stats.length > 0 && (
          <dl
            aria-label={statsLabel}
            className={cn(
              "mt-6 grid gap-px overflow-hidden rounded-2xl bg-primary/[0.08] ring-1 ring-primary/[0.08]",
              stats.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse gap-1 bg-white px-4 py-4 sm:px-5">
                <dt className="text-meta text-primary-600">{s.label}</dt>
                <dd className="flex items-center gap-1.5 font-serif text-heading text-primary-900">
                  {s.icon}
                  {typeof s.value === "number" ? (
                    <AnimatedNumber value={s.value} format={s.format ?? ((n) => String(n))} />
                  ) : (
                    <span className="tabular-nums">{s.text}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
