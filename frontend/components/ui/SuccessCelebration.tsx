"use client";

/**
 * SuccessCelebration, the brand "done" moment (booking confirmed, listing published).
 *
 *   <SuccessCelebration
 *     title="Your stay is confirmed"
 *     description="Amina will message you before check-in."
 *     actions={<Button href="/trips">View my trips</Button>}
 *   />
 *
 * Plays once on mount: the arch outline draws, a rosette burst (8 terracotta/olive rays and
 * dots) blooms from the centre, then the check mark draws. Decoration is aria-hidden; the
 * title is announced via role="status". Reduced motion → static final frame, no burst.
 * Text uses CSS entrances (`enter-up`) so it is never hidden in server HTML.
 */

import React from "react";
import { m, useReducedMotion } from "framer-motion";
import { dur, ease, spring } from "@/lib/motion";
import { cn } from "./cn";

const ARCH =
  "M40 122V61.6C40 44 51.2 32.8 64 27.2C70.4 24.4 76 22.4 80 20C84 22.4 89.6 24.4 96 27.2C108.8 32.8 120 44 120 61.6V122Z";

export interface SuccessCelebrationProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  size?: number;
  className?: string;
}

export function SuccessCelebration({
  title,
  description,
  actions,
  size = 176,
  className,
}: SuccessCelebrationProps) {
  const reduce = useReducedMotion();
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

  return (
    <div
      role="status"
      className={cn("flex flex-col items-center text-center", className)}
    >
      <svg
        width={size}
        height={(size * 140) / 160}
        viewBox="0 0 160 140"
        fill="none"
        aria-hidden="true"
        className="overflow-visible"
      >
        <ellipse cx="80" cy="124" rx="58" ry="6" fill="#E4EAF2" opacity="0.7" />
        <m.path
          d={ARCH}
          fill="#D7EEFA"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur.slow, delay: 0.25 }}
        />
        <m.path
          d={ARCH}
          stroke="#152C52"
          strokeWidth="1.75"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: ease.inOut }}
        />
        {/* Rosette burst */}
        {!reduce &&
          rays.map((a, i) => {
            const x1 = 80 + Math.cos(a) * 30;
            const y1 = 80 + Math.sin(a) * 30;
            const x2 = 80 + Math.cos(a) * 52;
            const y2 = 80 + Math.sin(a) * 52;
            return (
              <m.g
                key={i}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 1.15] }}
                transition={{
                  duration: 0.9,
                  delay: 0.55,
                  ease: ease.out,
                  times: [0, 0.35, 1],
                }}
                style={{ originX: "80px", originY: "80px" }}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={i % 2 ? "#0E6FAD" : "#0B57D0"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle
                  cx={80 + Math.cos(a + Math.PI / 8) * 58}
                  cy={80 + Math.sin(a + Math.PI / 8) * 58}
                  r="2"
                  fill={i % 2 ? "#0B57D0" : "#D3DCE8"}
                />
              </m.g>
            );
          })}
        {/* Check badge */}
        <m.circle
          cx="80"
          cy="84"
          r="20"
          fill="#0E6FAD"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.pop, delay: 0.45 }}
          style={{ originX: "80px", originY: "84px" }}
        />
        <m.path
          d="M71 84.5l6.2 6.2L90 78"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: dur.base, delay: 0.75, ease: ease.out }}
        />
        <path
          d="M128 30l2.4 5.6L136 38l-5.6 2.4L128 46l-2.4-5.6L120 38l5.6-2.4z"
          stroke="#0B57D0"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <h2
        className="enter-up mt-4 font-serif text-display-md text-primary-900"
        style={{ animationDelay: "500ms" }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="enter-up mt-2 max-w-[44ch] text-body text-primary-600"
          style={{ animationDelay: "600ms" }}
        >
          {description}
        </p>
      )}
      {actions && (
        <div
          className="enter-up mt-6 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "700ms" }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

export default SuccessCelebration;
