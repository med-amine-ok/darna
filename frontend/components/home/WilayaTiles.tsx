"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import SectionHeader from "@/components/ui/SectionHeader";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { findDestinationByKey } from "@/components/search/destinations";
import { wilayaImagery } from "@/lib/imagery";

export interface WilayaTile {
  key: string;
  count: number;
}

function Tile({ tile, large }: { tile: WilayaTile; large?: boolean }) {
  const tDest = useTranslations("search.destinations");
  const t = useTranslations("homeHero.sections");
  const dest = findDestinationByKey(tile.key);
  if (!dest) return null;

  return (
    <Link
      href={{ pathname: "/search", query: { destination: dest.name } }}
      className="group relative block h-full rounded-3xl overflow-hidden bg-tertiary-200 shadow-e1 transition-[box-shadow,transform] duration-base ease-out hover:shadow-e3 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-4 focus-visible:ring-offset-darnaBg"
    >
      <Image
        src={`${wilayaImagery[tile.key]}?auto=format&fit=crop&w=${large ? 1100 : 700}&q=78`}
        alt=""
        fill
        sizes={large ? "(min-width: 1024px) 40vw, 80vw" : "(min-width: 1024px) 20vw, 60vw"}
        className={`object-cover transition-transform [transition-duration:900ms] ease-out group-hover:scale-[1.06]`}
      />
      <div aria-hidden="true" className="absolute inset-0 scrim-bottom" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
        <p className="text-eyebrow uppercase font-semibold text-tertiary-200 tabular-nums">
          {t("wilayaCount", { count: tile.count })}
        </p>
        <h3 className={`mt-1.5 font-serif leading-tight ${large ? "text-[2rem] sm:text-[2.5rem]" : "text-[1.5rem]"}`}>
          {tDest(`${dest.key}.name`)}
        </h3>
        <p className="mt-1 text-meta text-white/80 line-clamp-1">{tDest(`${dest.key}.tag`)}</p>
      </div>
    </Link>
  );
}

/** "Explore by wilaya" bento: one tall feature tile + four smaller tiles; a swipe rail on phones. */
export default function WilayaTiles({ tiles }: { tiles: WilayaTile[] }) {
  const t = useTranslations("homeHero.sections");
  const [feature, ...rest] = tiles;
  if (!feature) return null;

  return (
    <section aria-labelledby="wilaya-heading" className="space-y-7">
      <SectionHeader id="wilaya-heading" eyebrow={t("wilayaEyebrow")} title={t("wilayaTitle")} subtitle={t("wilayaSubtitle")} />

      {/* Phones: rail */}
      <RevealGroup className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 scroll-px-4 pb-2">
        {tiles.map((tile) => (
          <RevealItem key={tile.key} className="snap-start shrink-0 w-[68vw] aspect-[4/5]">
            <Tile tile={tile} />
          </RevealItem>
        ))}
      </RevealGroup>

      {/* Tablet & desktop: bento */}
      <RevealGroup className="hidden md:grid grid-cols-4 grid-rows-2 gap-5 h-[34rem] lg:h-[38rem]">
        <RevealItem className="col-span-2 row-span-2">
          <Tile tile={feature} large />
        </RevealItem>
        {rest.slice(0, 4).map((tile) => (
          <RevealItem key={tile.key}>
            <Tile tile={tile} />
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
