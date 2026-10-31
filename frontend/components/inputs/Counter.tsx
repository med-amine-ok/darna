"use client";

/**
 * Counter, "title / subtitle ······ (−) 2 (+)" stepper used for guests, rooms, beds.
 * Kit styling: white e1 round buttons with spring press, the value rolls up/down
 * (direction-aware) on change; buttons disable at min/max. API unchanged.
 */

import React, { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "framer-motion";
import { BrandMinusIcon, BrandPlusIcon } from "@/components/icons";
import { dur, ease, spring } from "@/lib/motion";

interface CounterProps {
  title: string;
  subtitle?: string;
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  /** Upper bound (inclusive); the + button is disabled at the max. */
  maxValue?: number;
}

const stepButton =
  "relative w-10 h-10 rounded-full bg-white shadow-e1 flex items-center justify-center text-primary-800 cursor-pointer select-none " +
  "transition-[box-shadow,color,opacity] duration-fast ease-standard hover:shadow-e2 hover:text-primary-900 " +
  "disabled:opacity-35 disabled:shadow-none disabled:cursor-not-allowed disabled:bg-darnaBg-300 " +
  "before:absolute before:-inset-0.5 before:content-[''] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function Counter({
  title,
  subtitle,
  value,
  onChange,
  minValue = 1,
  maxValue,
}: CounterProps) {
  const t = useTranslations("common");
  const atMax = maxValue !== undefined && value >= maxValue;
  const direction = useRef(1);

  const onAdd = useCallback(() => {
    if (maxValue !== undefined && value >= maxValue) return;
    direction.current = 1;
    onChange(value + 1);
  }, [onChange, value, maxValue]);

  const onReduce = useCallback(() => {
    if (value <= minValue) return;
    direction.current = -1;
    onChange(value - 1);
  }, [value, onChange, minValue]);

  return (
    <div className="flex flex-row items-center justify-between gap-4 py-2">
      <div className="flex flex-col text-start min-w-0">
        <div className="font-semibold text-body text-primary-900">{title}</div>
        {subtitle && (
          <div className="text-meta text-primary-500">{subtitle}</div>
        )}
      </div>
      <div className="flex flex-row items-center gap-2 shrink-0">
        <m.button
          type="button"
          aria-label={t("decreaseValue", { field: title })}
          onClick={onReduce}
          disabled={value <= minValue}
          whileTap={value <= minValue ? undefined : { scale: 0.88 }}
          transition={spring.press}
          className={stepButton}
        >
          <BrandMinusIcon size={14} strokeWidth={2} />
        </m.button>
        <div
          aria-live="polite"
          className="relative h-7 min-w-[2rem] overflow-hidden text-center font-semibold text-title text-primary-900 tabular-nums select-none"
        >
          <AnimatePresence
            initial={false}
            mode="popLayout"
            custom={direction.current}
          >
            <m.span
              key={value}
              custom={direction.current}
              className="absolute inset-0 flex items-center justify-center"
              variants={{
                enter: (d: number) => ({ y: d * 14, opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (d: number) => ({ y: d * -14, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: dur.fast, ease: ease.out }}
            >
              {value}
            </m.span>
          </AnimatePresence>
        </div>
        <m.button
          type="button"
          aria-label={t("increaseValue", { field: title })}
          onClick={onAdd}
          disabled={atMax}
          whileTap={atMax ? undefined : { scale: 0.88 }}
          transition={spring.press}
          className={stepButton}
        >
          <BrandPlusIcon size={14} strokeWidth={2} />
        </m.button>
      </div>
    </div>
  );
}
