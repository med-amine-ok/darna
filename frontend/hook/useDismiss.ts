"use client";

import type React from "react";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Non-modal popover/dropdown behaviour: closes on a click outside `containerRef`
 * and on Escape. After Escape, focus returns to `triggerRef` (if given).
 */
export function useDismiss(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement>,
  onClose: () => void,
  triggerRef?: RefObject<HTMLElement>
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onCloseRef.current();
      triggerRef?.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, containerRef, triggerRef]);
}

/**
 * Arrow-key / Home / End navigation between `[role^="menuitem"]` children of a
 * `role="menu"` container. Attach as the menu's onKeyDown.
 */
export function handleMenuKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])')
  );
  if (items.length === 0) return;
  event.preventDefault();
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next = 0;
  if (event.key === "End") next = items.length - 1;
  else if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
  else if (event.key === "ArrowUp") next = index <= 0 ? items.length - 1 : index - 1;
  items[next].focus();
}

/** Focus the first menu item of a just-opened menu (call from an effect). */
export function focusFirstMenuItem(menu: HTMLElement | null) {
  menu?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
}
