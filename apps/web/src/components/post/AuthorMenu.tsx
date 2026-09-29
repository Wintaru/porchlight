"use client";

import { type ReactNode, useRef, useState } from "react";

import styles from "./post.module.css";

// Room kept between an open menu and the edge of the screen.
const EDGE_GAP_PX = 8;

// The author's ⋯ menu. The byline wraps, so the ⋯ can sit at either edge of the
// screen: the menu opens from its left side, and from its right side when that would
// run off the screen.
export function AuthorMenu({ children }: { readonly children: ReactNode }) {
  const [alignEnd, setAlignEnd] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  function onToggle(): void {
    const summary = summaryRef.current;
    const items = itemsRef.current;
    if (detailsRef.current?.open !== true || summary === null || items === null) {
      return;
    }
    const fromLeft = summary.getBoundingClientRect().left + items.scrollWidth;
    setAlignEnd(fromLeft > window.innerWidth - EDGE_GAP_PX);
  }

  return (
    <details
      ref={detailsRef}
      className={styles.authorMenu}
      data-align={alignEnd ? "end" : "start"}
      data-testid="post-author-menu"
      onToggle={onToggle}
    >
      <summary ref={summaryRef} aria-label="More actions for this post">
        ⋯
      </summary>
      <div ref={itemsRef} className={styles.authorMenuItems}>
        {children}
      </div>
    </details>
  );
}
