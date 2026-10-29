"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

interface Options {
  /** Called on Escape. Omit to make Escape do nothing (e.g. while busy). */
  onEscape?: () => void;
  /** Element to focus first; defaults to the first focusable element in the dialog. */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Lock page scroll while open (default true). */
  lockScroll?: boolean;
}

/**
 * Modal dialog behaviour required by WAI-ARIA: moves focus into the dialog,
 * keeps Tab/Shift+Tab inside it, closes on Escape, locks page scroll and
 * returns focus to the element that opened it.
 */
export function useDialogA11y<T extends HTMLElement>(
  isOpen: boolean,
  { onEscape, initialFocusRef, lockScroll = true }: Options = {}
): RefObject<T> {
  const containerRef = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      container
        ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null || el === document.activeElement
          )
        : [];

    const raf = requestAnimationFrame(() => {
      if (!container || container.contains(document.activeElement)) return;
      const target = initialFocusRef?.current ?? focusables()[0] ?? container;
      if (target === container && !container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onEscapeRef.current) {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      if (lockScroll) document.body.style.overflow = originalOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
    };
  }, [isOpen, initialFocusRef, lockScroll]);

  return containerRef;
}
