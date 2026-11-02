/**
 * Brand line illustrations built from the BLADUS arch + zellige rosette (DESIGN-DIRECTION §6).
 *
 *   <Illustration variant="search" />      // search · favorites · messages · calendar · generic · error · success
 *   <Illustration variant="favorites" size={120} animate={false} />
 *
 * Inline SVG in palette colours (ink arch, olive glyph, terracotta accents, sand fill).
 * Strokes draw in once with the CSS `.draw-in` class (styles/globals.css), runs from the
 * server HTML, no JS, instant under reduced motion. Decorative: aria-hidden.
 * Server-component safe.
 */

import React from "react";
import { cn } from "./cn";

export type IllustrationVariant =
  | "search"
  | "favorites"
  | "messages"
  | "calendar"
  | "generic"
  | "error"
  | "success";

const INK = "#2E3A2F";
const OLIVE = "#6B7F5B";
const TERRACOTTA = "#C96F4F";
const SAND = "#F4EFE7";
const SAND_DEEP = "#E9DFD0";

// The logo arch (public/brand/arch-mask.svg, 100×125) scaled into a 160×140 canvas.
const ARCH =
  "M40 122V61.6C40 44 51.2 32.8 64 27.2C70.4 24.4 76 22.4 80 20C84 22.4 89.6 24.4 96 27.2C108.8 32.8 120 44 120 61.6V122";
const ROSETTE = "M0 -9L2.6 -2.6L9 0L2.6 2.6L0 9L-2.6 2.6L-9 0L-2.6 -2.6Z";

function Stroke({
  d,
  color = INK,
  width = 1.75,
  delay = 0,
  animate,
  ...rest
}: React.SVGProps<SVGPathElement> & {
  color?: string;
  width?: number;
  delay?: number;
  animate: boolean;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      className={animate ? "draw-in" : undefined}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
      {...rest}
    />
  );
}

function Glyph({
  variant,
  animate,
}: {
  variant: IllustrationVariant;
  animate: boolean;
}) {
  const d = 350;
  switch (variant) {
    case "search":
      return (
        <>
          <Stroke
            animate={animate}
            delay={d}
            color={OLIVE}
            d="M65 84a13 13 0 1 0 26 0a13 13 0 1 0 -26 0"
          />
          <Stroke
            animate={animate}
            delay={d + 250}
            color={OLIVE}
            width={2.25}
            d="M87.5 93.5L98 104"
          />
          <Stroke
            animate={animate}
            delay={d + 400}
            color={TERRACOTTA}
            width={1.5}
            d="M71 75.5a8 8 0 0 1 6-3.5"
          />
        </>
      );
    case "favorites":
      return (
        <Stroke
          animate={animate}
          delay={d}
          color={OLIVE}
          d="M80 106s-17-9.6-17-22.2c0-6 4.6-10.3 9.9-10.3 3.4 0 5.8 1.7 7.1 4.2 1.3-2.5 3.7-4.2 7.1-4.2 5.3 0 9.9 4.3 9.9 10.3C97 96.4 80 106 80 106z"
        />
      );
    case "messages":
      return (
        <>
          <Stroke
            animate={animate}
            delay={d}
            color={OLIVE}
            d="M60 74h40a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H76l-9 7v-7h-7a6 6 0 0 1-6-6V80a6 6 0 0 1 6-6z"
          />
          <Stroke
            animate={animate}
            delay={d + 300}
            color={TERRACOTTA}
            width={1.5}
            d="M66 84h28M66 90h18"
          />
        </>
      );
    case "calendar":
      return (
        <>
          <Stroke
            animate={animate}
            delay={d}
            color={OLIVE}
            d="M60 76h40a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H60a4 4 0 0 1-4-4V80a4 4 0 0 1 4-4zM56 86h48M68 71v9M92 71v9"
          />
          <circle cx="68" cy="95" r="2" fill={OLIVE} />
          <circle cx="80" cy="95" r="2" fill={OLIVE} />
          <circle cx="92" cy="95" r="2.6" fill={TERRACOTTA} />
        </>
      );
    case "error":
      return (
        <>
          <Stroke
            animate={animate}
            delay={d}
            color={TERRACOTTA}
            width={2.25}
            d="M80 72v20"
          />
          <circle cx="80" cy="102" r="2.2" fill={TERRACOTTA} />
        </>
      );
    case "success":
      return (
        <Stroke
          animate={animate}
          delay={d}
          color={OLIVE}
          width={2.5}
          d="M66 90l9 9 19-21"
        />
      );
    default:
      return (
        <>
          <g transform="translate(80 86) scale(1.5)">
            <Stroke
              animate={animate}
              delay={d}
              color={OLIVE}
              width={1.1}
              d={ROSETTE}
            />
          </g>
          <Stroke
            animate={animate}
            delay={d + 300}
            color={OLIVE}
            width={1.25}
            d="M52 112c8-5 16-5 24 0s16 5 24 0 12-4 8-2"
          />
        </>
      );
  }
}

export interface IllustrationProps {
  variant?: IllustrationVariant;
  /** Width in px (height keeps 160:140). */
  size?: number;
  animate?: boolean;
  className?: string;
}

export function Illustration({
  variant = "generic",
  size = 160,
  animate = true,
  className,
}: IllustrationProps) {
  return (
    <svg
      width={size}
      height={(size * 140) / 160}
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {/* Ground shadow + sand interior */}
      <ellipse cx="80" cy="124" rx="58" ry="6" fill={SAND_DEEP} opacity="0.7" />
      <path d={`${ARCH}Z`} fill={SAND} />
      {/* Dotted zellige band behind the arch */}
      <g opacity="0.55">
        {[22, 34, 126, 138].map((x) => (
          <circle key={x} cx={x} cy="104" r="1.4" fill={OLIVE} />
        ))}
      </g>
      <Stroke animate={animate} d={ARCH} />
      <Stroke
        animate={animate}
        delay={150}
        width={1.25}
        color={SAND_DEEP}
        d="M48 122V64c0-14 9-23.5 20-28.5"
      />
      <Stroke animate={animate} delay={80} d="M28 122h104" />
      {/* Rosettes */}
      <g transform="translate(128 34)">
        <Stroke
          animate={animate}
          delay={500}
          color={TERRACOTTA}
          width={1.4}
          d={ROSETTE}
        />
      </g>
      <circle cx="128" cy="34" r="1.6" fill={TERRACOTTA} />
      <g transform="translate(30 50) scale(0.6)">
        <Stroke
          animate={animate}
          delay={600}
          color={OLIVE}
          width={2}
          d={ROSETTE}
        />
      </g>
      <Glyph variant={variant} animate={animate} />
    </svg>
  );
}

export default Illustration;
