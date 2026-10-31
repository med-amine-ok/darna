"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const STORAGE_KEY = "darna_reduce_motion";

// Animation features load after first paint; entrances are CSS, so nothing waits on this.
const loadFeatures = () => import("./features").then((res) => res.default);

type MotionPreference = "system" | "reduce";

const MotionPreferenceContext = createContext<{
  preference: MotionPreference;
  setPreference: (p: MotionPreference) => void;
}>({ preference: "system", setPreference: () => {} });

/** In-app "reduce motion" switch (Settings) on top of the OS preference. */
export function useMotionPreference() {
  return useContext(MotionPreferenceContext);
}

/**
 * Root motion setup: lazy-loads the DOM animation features (smaller bundle),
 * honours prefers-reduced-motion ("user") or the in-app override ("always"),
 * and mirrors the choice to <html data-reduce-motion> so CSS animations follow.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>("system");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setPreferenceState("reduce");
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-reduce-motion", preference === "reduce");
  }, [preference]);

  const setPreference = useCallback((p: MotionPreference) => {
    setPreferenceState(p);
    try {
      if (p === "reduce") localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return (
    <MotionPreferenceContext.Provider value={{ preference, setPreference }}>
      <LazyMotion features={loadFeatures} strict>
        <MotionConfig reducedMotion={preference === "reduce" ? "always" : "user"}>
          <ScrollReveal />
          {children}
        </MotionConfig>
      </LazyMotion>
    </MotionPreferenceContext.Provider>
  );
}
