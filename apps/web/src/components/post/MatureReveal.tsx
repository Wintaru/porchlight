"use client";

import { type ReactNode, useState, useSyncExternalStore } from "react";

import styles from "./post.module.css";

const noSubscription = () => () => undefined;

// A mature post's cover and body behind one click (SPEC.md §7, #117). Like RevealImage,
// the control is a real checkbox with its label, so it works with the keyboard and with
// no JavaScript, and the label comes first so a screen reader meets the choice first.
// Once the page runs JavaScript, the hidden text is also `inert` until the reader asks:
// a blur hides nothing from a screen reader or from Tab. Before that it is not, so a
// reader with no JavaScript can still follow its links once they reveal it.
// `data-nosnippet` keeps a search engine from quoting the blurred text.
export function MatureReveal({
  id,
  children,
}: {
  readonly id: string;
  readonly children: ReactNode;
}) {
  const toggleId = `reveal-post-${id}`;
  const [revealed, setRevealed] = useState(false);
  const scripted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return (
    <div className={styles.mature} data-testid="mature-reveal">
      <input
        id={toggleId}
        type="checkbox"
        className={styles.matureToggle}
        onChange={(event) => {
          setRevealed(event.target.checked);
        }}
      />
      <label htmlFor={toggleId} className={styles.matureLabel}>
        Mature content. Show post
      </label>
      <div
        className={styles.matureContent}
        data-testid="mature-content"
        data-nosnippet
        inert={scripted && !revealed}
      >
        {children}
      </div>
    </div>
  );
}
