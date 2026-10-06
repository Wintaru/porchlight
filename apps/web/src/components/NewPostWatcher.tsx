"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Once a minute, as long as a reader can see the page (D33).
export const POLL_INTERVAL_MS = 60_000;
// A request that hangs must not stop the polling for the life of the tab.
const REQUEST_TIMEOUT_MS = 10_000;

interface NewPostWatcherProps {
  // The newest post the page shows, or null when it shows none.
  readonly newestShown: string | null;
}

// The home page shows a new post without a reload (D33). While the tab is visible it
// asks `/api/latest-post` when the newest public post went up, and re-renders the page
// in place when that is later than anything shown. A hidden tab does not ask, and asks
// once when it comes back after a full interval. Each newer time re-renders once, so a
// post this reader's filters leave out does not re-render the page every minute.
export function NewPostWatcher({ newestShown }: NewPostWatcherProps) {
  const router = useRouter();
  const actedOn = useRef(newestShown);

  useEffect(() => {
    let lastAsked = Date.now();
    let asking = false;
    const leaving = new AbortController();

    async function check(): Promise<void> {
      if (asking || document.visibilityState !== "visible") {
        return;
      }
      asking = true;
      lastAsked = Date.now();
      try {
        const response = await fetch("/api/latest-post", {
          signal: AbortSignal.any([
            leaving.signal,
            AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          ]),
        });
        if (!response.ok) {
          return;
        }
        const { publishedAt } = (await response.json()) as {
          readonly publishedAt: string | null;
        };
        if (publishedAt !== null && isLater(publishedAt, actedOn.current)) {
          actedOn.current = publishedAt;
          router.refresh();
        }
      } catch {
        // Offline, timed out, or the reader left: the next tick, if any, asks again.
      } finally {
        asking = false;
      }
    }

    function onVisible(): void {
      if (Date.now() - lastAsked >= POLL_INTERVAL_MS) {
        void check();
      }
    }

    const timer = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      leaving.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}

function isLater(candidate: string, than: string | null): boolean {
  return than === null || Date.parse(candidate) > Date.parse(than);
}
