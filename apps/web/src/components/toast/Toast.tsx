"use client";

import { useSearchParams } from "next/navigation";
import { type AnimationEvent, useState } from "react";

import styles from "./toast.module.css";
import { withoutParam } from "./without-param";

interface ToastProps {
  // The confirmation a server action reported, already turned into a sentence.
  readonly message: string;
  // The query parameter the action redirected with (`saved`, `done`, `comment`, …).
  readonly param: string;
  readonly testId: string;
}

// A short-lived confirmation pinned to the bottom of the screen. The server renders it,
// and CSS alone fades it out, so it also works before hydration and without JS. JS adds
// the dismiss button and removes `param` from the address once the toast is gone.
export function Toast({ message, param, testId }: ToastProps) {
  const code = useSearchParams().get(param);
  const [arrival, setArrival] = useState(0);
  const [lastCode, setLastCode] = useState(code);
  // Shown only when the code is in the address. Back to a page whose code was already
  // removed restores the old render from the router cache, which must not replay.
  const [shown, setShown] = useState(code !== null);

  // A second save redirects to a page this toast is already mounted on: React keeps the
  // element, so the fade would not run again. A code that comes back (it was removed
  // when the last toast finished) or changes (a second queue action) is a new arrival,
  // and the key below remounts.
  if (code !== lastCode) {
    setLastCode(code);
    if (code !== null) {
      setArrival((n) => n + 1);
      setShown(true);
    }
  }

  if (!shown) {
    return null;
  }

  function consumeParam(): void {
    window.history.replaceState(null, "", withoutParam(window.location.href, param));
  }

  // Only the toast's own fade counts: an animation inside it would bubble here too.
  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      consumeParam();
    }
  }

  function dismiss(): void {
    setShown(false);
    consumeParam();
  }

  return (
    <div key={arrival} className={styles.toast} onAnimationEnd={onAnimationEnd}>
      <p role="status" className={styles.message} data-testid={testId}>
        {message}
      </p>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
