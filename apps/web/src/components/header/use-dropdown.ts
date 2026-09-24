"use client";

import { usePathname } from "next/navigation";
import { type MouseEvent, type RefObject, useEffect, useRef, useState } from "react";

interface Dropdown {
  readonly open: boolean;
  readonly toggle: () => void;
  // For the panel: a click on a link inside it closes it, even a link to this page.
  readonly closeOnLinkClick: (event: MouseEvent<HTMLElement>) => void;
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}

// The header's three dropdowns (the bell, the account menu, a visitor's menu) open and
// close alike: Escape closes, a pointer or keyboard focus landing outside closes, a
// link inside closes, and moving to another page closes. The header lives in the root
// layout and keeps its state across a client-side navigation, so the path a dropdown
// was opened on is stored, and a render on any other path clears it (React's "adjust
// state when a value changes" pattern) — it cannot reopen on the way back.
export function useDropdown(): Dropdown {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && openOn !== pathname) {
    setOpenOn(null);
  }
  const open = openOn === pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const inside = (target: EventTarget | null) =>
      target instanceof Node && rootRef.current?.contains(target) === true;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }
      // Focus goes back to the button only if it was in this dropdown: an Escape
      // meant for a dialog elsewhere must not pull focus up to the header.
      const focusWasInside = inside(document.activeElement);
      setOpenOn(null);
      if (focusWasInside) {
        triggerRef.current?.focus();
      }
    };
    const closeFromOutside = (event: Event) => {
      if (!inside(event.target)) {
        setOpenOn(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeFromOutside);
    // Tabbing on to another control (another dropdown's button, say) closes this one.
    document.addEventListener("focusin", closeFromOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("focusin", closeFromOutside);
    };
  }, [open]);

  return {
    open,
    toggle: () => {
      setOpenOn(open ? null : pathname);
    },
    closeOnLinkClick: (event) => {
      if (event.target instanceof Element && event.target.closest("a") !== null) {
        setOpenOn(null);
      }
    },
    rootRef,
    triggerRef,
  };
}
