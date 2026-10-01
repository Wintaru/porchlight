"use client";

import { type ReactNode, useEffect, useRef } from "react";

// How far a reader scrolls back up before the header comes back: enough that a
// trackpad's jitter does not flash it.
const REVEAL_DISTANCE = 12;

interface SiteHeaderProps {
  readonly className: string | undefined;
  readonly children: ReactNode;
}

// The header hides while the reader scrolls down and comes back on a short scroll up.
// The state goes on <html> as `data-site-header`, so globals.css can move
// `--site-header-offset` and every other sticky bar follows the header down and up.
// It stays in view near the top of the page, while it holds keyboard focus, and while
// one of its dropdowns is open.
export function SiteHeader({ className, children }: SiteHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (header === null) {
      return;
    }
    const root = document.documentElement;
    const setHidden = (hidden: boolean) => {
      if (hidden) {
        root.dataset.siteHeader = "hidden";
      } else {
        delete root.dataset.siteHeader;
      }
    };
    // Keyboard focus only: a mouse click leaves focus on the button it pressed, and
    // that must not pin the header.
    const mustStay = () =>
      header.querySelector(':focus-visible, [aria-expanded="true"]') !== null;

    let lastY = currentScrollY();
    let upTravel = 0;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = currentScrollY();
      const delta = y - lastY;
      lastY = y;
      if (y <= header.offsetHeight) {
        upTravel = 0;
        setHidden(false);
        return;
      }
      if (delta > 0) {
        upTravel = 0;
        if (!mustStay()) {
          setHidden(true);
        }
      } else if (delta < 0) {
        upTravel -= delta;
        if (upTravel >= REVEAL_DISTANCE) {
          setHidden(false);
        }
      }
    };
    const onScroll = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };
    const reveal = () => {
      setHidden(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("focusin", reveal);
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeEventListener("focusin", reveal);
      cancelAnimationFrame(frame);
      setHidden(false);
    };
  }, []);

  return (
    <header ref={headerRef} className={className}>
      {children}
    </header>
  );
}

// Clamped to the real scroll range: Safari's rubber-band bounce at either end reports
// positions past it, and the bounce back from the bottom must not read as a scroll up.
function currentScrollY(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.min(Math.max(window.scrollY, 0), Math.max(max, 0));
}
