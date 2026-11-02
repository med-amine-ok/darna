"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { imagery } from "@/lib/imagery";

/**
 * "All of Algeria" in one picture with no background: the country's outline (projected
 * from real border coordinates) filled with photography, the Mediterranean coast of Algiers
 * melting into the Saharan dunes, with pins on major destinations that open a search.
 */

/** Algeria outline, equirectangular projection (x scaled by cos 28°), 740 × 730 units. */
const OUTLINE =
  "M236.6 88L248.6 88L268.4 80L291.7 63.2L317.5 54.8L342.6 38L360.2 31.2L392 28L416.8 20L429.1 20L452.1 15.2L483.9 16L493.7 22L518.1 19.2L536.8 8.8L558 15.2L575.7 12L588.7 16L612.4 14L618.8 14.4L612.8 36L606.8 68L609.2 88L607.5 108L589.8 124L582.7 138L588 160L603.9 180L634 208L651.6 282.8L662.2 320L664 384L658.7 428L676.3 476L688.7 494L722.3 520L737.8 551.2L577.4 658L519.2 714L464.4 726L429.1 728L422 698L377.9 680L355.7 662.4L143.7 492L8.1 400.4L8.1 344L45.9 316L84.8 310L123.6 294L158.9 268L187.2 248L222.5 224L270.2 208L271.9 184L261.4 172L254.3 144L252.5 104L236.6 88Z";

/** Pins: destination key (search.destinations), `?destination=` value, position in % of the box. */
const PINS = [
  { key: "algiers", value: "Algiers", x: 57.3, y: 3, delay: 500 },
  { key: "oran", value: "Oran", x: 39.5, y: 8.8, delay: 600 },
  { key: "constantine", value: "Constantine", x: 74.2, y: 5.2, delay: 700 },
  { key: "ghardaia", value: "Ghardaïa", x: 60.2, y: 26.4, delay: 800 },
  { key: "taghit", value: "Taghit", x: 32.9, y: 35.1, delay: 900 },
  { key: "djanet", value: "Djanet", x: 88, y: 70.1, delay: 1000 },
] as const;

export default function AlgeriaMap({ className = "" }: { className?: string }) {
  const t = useTranslations("homeHero");
  const tDest = useTranslations("search.destinations");

  return (
    <div className={`relative aspect-[740/730] ${className}`}>
      <svg
        viewBox="0 0 740 730"
        role="img"
        aria-label={t("mapAlt")}
        className="absolute inset-0 h-full w-full overflow-visible [filter:drop-shadow(0_24px_36px_rgba(30,38,31,0.22))_drop-shadow(0_2px_4px_rgba(30,38,31,0.12))]"
      >
        <defs>
          <clipPath id="darna-algeria-shape">
            <path d={OUTLINE} />
          </clipPath>
          {/* The coast photo fades out southwards into the Sahara. */}
          <linearGradient id="darna-coast-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.3" stopColor="#fff" />
            <stop offset="0.65" stopColor="#888" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id="darna-coast-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="740" height="330">
            <rect x="0" y="0" width="740" height="330" fill="url(#darna-coast-fade)" />
          </mask>
        </defs>

        <g clipPath="url(#darna-algeria-shape)">
          <rect width="740" height="730" fill="#E9DFD0" />
          <image
            href={`${imagery.dunesGolden}?auto=format&fit=crop&w=1100&q=75`}
            x="0"
            y="90"
            width="740"
            height="640"
            preserveAspectRatio="xMidYMid slice"
          />
          <image
            href={`${imagery.algiersBay}?auto=format&fit=crop&w=1100&h=520&q=75`}
            x="0"
            y="0"
            width="740"
            height="330"
            preserveAspectRatio="xMidYMid slice"
            mask="url(#darna-coast-mask)"
          />
          {/* Warm light so both photos read as one picture. */}
          <rect width="740" height="730" fill="#C96F4F" opacity="0.08" />
        </g>
        <path d={OUTLINE} fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      </svg>

      {/* Destination pins */}
      {PINS.map((p) => (
        <Link
          key={p.key}
          href={{ pathname: "/search", query: { destination: p.value } }}
          aria-label={tDest(`${p.key}.name`)}
          className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
          style={{ left: `${p.x}%`, top: `${Math.max(p.y, 4)}%` }}
        >
          <span className="enter-pop flex flex-col items-center" style={{ animationDelay: `${p.delay}ms` }}>
            <span className="relative flex h-3.5 w-3.5 items-center justify-center">
              <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-accent-500/50 [animation-duration:2.4s]" />
              <span className="relative h-3 w-3 rounded-full bg-accent-600 ring-2 ring-white shadow-e2" />
            </span>
            <span className="mt-1.5 hidden whitespace-nowrap rounded-full glass-light sm:block px-2.5 py-0.5 text-[12px] font-semibold text-primary-900 shadow-e2 transition-transform duration-fast ease-standard group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-accent-600">
              {tDest(`${p.key}.name`)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
