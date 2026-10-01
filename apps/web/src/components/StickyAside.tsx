"use client";

import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";

// The space kept under a tall sidebar once its end is in view.
const BOTTOM_GAP = 24;

// A sticky sidebar with no scrollbar of its own. One that fits the window just sticks.
// One taller than the window moves with the page until its far end is in view, then
// holds there, in both directions: the script moves the sticky `top` by the scroll
// distance through `--aside-shift`, which the sidebar's CSS adds to its `top`.
export function StickyAside(props: ComponentPropsWithoutRef<"aside">) {
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const aside = asideRef.current;
    if (aside === null) {
      return;
    }
    let shift = 0;
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      const stuckTop = Number.parseFloat(getComputedStyle(aside).top) - shift;
      const room = window.innerHeight - BOTTOM_GAP - stuckTop;
      const lowest = Math.min(0, room - aside.offsetHeight);
      shift = Math.min(0, Math.max(lowest, shift - delta));
      aside.style.setProperty("--aside-shift", `${String(shift)}px`);
    };
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };
    // The header's slide moves the sticky `top` after the last scroll event: measure
    // again once it lands.
    const root = document.documentElement;
    const slid = (event: TransitionEvent) => {
      if (event.target === root && event.propertyName === "--site-header-offset") {
        schedule();
      }
    };
    const resized = new ResizeObserver(schedule);
    resized.observe(aside);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    root.addEventListener("transitionend", slid);
    return () => {
      resized.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      root.removeEventListener("transitionend", slid);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <aside ref={asideRef} {...props} />;
}
