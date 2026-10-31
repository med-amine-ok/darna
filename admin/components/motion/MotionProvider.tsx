"use client";

import { useEffect } from "react";
import { LazyMotion, MotionConfig, domMax } from "framer-motion";

/** True once the first client render has committed (later mounts are client navigations). */
let hydrated = false;
export function hasHydrated() {
  return hydrated;
}

/**
 * Root motion setup for the back-office: LazyMotion in strict mode (only `m.*`
 * components are allowed, `motion.*` throws), `domMax` features because the
 * sidebar/tabs indicators use shared `layoutId`, and `reducedMotion="user"` so
 * prefers-reduced-motion is honoured (CSS animations follow via globals.css).
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrated = true;
  }, []);

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
