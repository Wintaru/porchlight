"use client";

import { useState } from "react";

import styles from "./share.module.css";

interface ShareButtonProps {
  readonly url: string;
  readonly title: string;
}

// SPEC.md §9: copies the link everywhere, and where the browser has a native share
// sheet (mostly mobile), opens that instead. No per-post off switch (D18).
export function ShareButton({ url, title }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // A user-dismissed share sheet throws `AbortError`; nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className={styles.share}>
      {status !== "idle" && (
        <span role="status" className={styles.status} data-testid="share-status">
          {status === "copied" ? "Link copied." : "Could not copy the link."}
        </span>
      )}
      <button
        type="button"
        className={styles.button}
        data-testid="share-button"
        onClick={() => void handleShare()}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M12 3v13" />
          <path d="M7 8l5-5 5 5" />
        </svg>
        Share
      </button>
    </div>
  );
}
