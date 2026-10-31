"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal]:not([data-revealed]), [data-reveal-stagger]:not([data-revealed])";
const MAX_STAGGER_ITEMS = 8; // later items in long rails reveal with the last delay

/**
 * App-wide reveal-on-scroll (used by components/motion/Reveal.tsx or any element with
 * `data-reveal` / `data-reveal-stagger` + `data-reveal-item` children). One
 * IntersectionObserver marks elements `data-revealed` once; CSS in globals.css does the
 * fade/rise. Elements are only hidden after this mounts (html.reveal-ready), so server
 * HTML is always visible. New nodes (client navigation) are picked up automatically.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window)) return;

    const reveal = (el: HTMLElement) => {
      const base = Number(el.dataset.revealDelay || 0);
      if (el.hasAttribute("data-reveal-stagger")) {
        const step = Number(el.dataset.revealStagger || 60);
        const items = el.querySelectorAll<HTMLElement>(":scope > [data-reveal-item]");
        items.forEach((item, i) => {
          item.style.transitionDelay = `${base + Math.min(i, MAX_STAGGER_ITEMS) * step}ms`;
          item.setAttribute("data-revealed", "");
        });
      } else if (base) {
        el.style.transitionDelay = `${base}ms`;
      }
      el.setAttribute("data-revealed", "");
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px 12% 0px", threshold: 0.03 }
    );

    const observe = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => io.observe(el));
    };

    const mo = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        mut.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(SELECTOR)) io.observe(node);
          observe(node);
        });
      }
    });

    // Touching these attributes while React is still hydrating server HTML (streamed
    // Suspense chunks included) triggers hydration warnings, so start only once the page
    // has loaded and the main thread is idle. Content above the fold at that moment is
    // marked revealed immediately (no hide-then-show flicker); the rest animates on scroll.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.getBoundingClientRect().top < vh) {
          el.setAttribute("data-revealed", "");
          el.querySelectorAll<HTMLElement>(":scope > [data-reveal-item]").forEach((item) => item.setAttribute("data-revealed", ""));
        }
      });
      observe(document);
      root.classList.add("reveal-ready");
      mo.observe(document.body, { childList: true, subtree: true });
      window.addEventListener("scroll", onScroll, { passive: true });
    };

    // A jump (anchor link, End key, restored scroll) can skip past an element without it
    // ever intersecting; reveal anything that is already above the bottom of the viewport.
    let ticking = false;
    const catchUp = () => {
      ticking = false;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.getBoundingClientRect().top < vh) {
          reveal(el);
          io.unobserve(el);
        }
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(catchUp);
    };

    type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const w = window as IdleWindow;
    const schedule = () => (w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 300));
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      window.removeEventListener("load", schedule);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
