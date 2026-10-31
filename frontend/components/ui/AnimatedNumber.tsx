"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  /** Seconds. */
  duration?: number;
}

/**
 * Number that tweens to its new value (prices, totals, KPIs). Text stays a single
 * text node so screen readers read the final value; reduced motion jumps instantly.
 */
export default function AnimatedNumber({ value, format, className, duration = 0.5 }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (reduceMotion || fromRef.current === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: ease.out,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return <span className={`tabular-nums ${className ?? ""}`}>{format(display)}</span>;
}
