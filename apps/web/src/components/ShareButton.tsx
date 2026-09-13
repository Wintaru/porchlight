"use client";

import { useState } from "react";

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
    <div>
      <button type="button" data-testid="share-button" onClick={() => void handleShare()}>
        Share
      </button>
      {status !== "idle" && (
        <span role="status" data-testid="share-status">
          {status === "copied" ? "Link copied." : "Could not copy the link."}
        </span>
      )}
    </div>
  );
}
