"use client";

import Script from "next/script";
import { useEffect } from "react";

import { useTurnstile } from "@/components/use-turnstile";
import { TURNSTILE_SRC } from "@/lib/turnstile";

function isInOpenDisclosure(element: HTMLElement): boolean {
  return element.closest("details")?.open === true;
}

// A Turnstile widget inside a closed <details> (an anonymous reply form, #33): rendered
// only once the disclosure first opens, so a thread of fifty comments does not load
// fifty challenges nobody asked for. The widget puts its `cf-turnstile-response` field
// inside this container, so the reply form carries the token like the root form does.
//
// Three moments can be the first one where both the script and an open disclosure
// exist, and each one tries: the disclosure opening, the script loading (`onLoad` is
// what next/script calls for a second <Script> with the same src, `onReady` for a
// remount after it loaded), and hydration itself (the visitor may open it first).
export function TurnstileOnOpen() {
  const { siteKey, container, renderIfWanted } = useTurnstile(isInOpenDisclosure);

  useEffect(() => {
    const details = container.current?.closest("details");
    if (details === null || details === undefined) {
      return;
    }
    details.addEventListener("toggle", renderIfWanted);
    return () => {
      details.removeEventListener("toggle", renderIfWanted);
    };
  }, [container, renderIfWanted]);

  if (siteKey === undefined) {
    return null;
  }
  return (
    <>
      <Script
        src={TURNSTILE_SRC}
        async
        defer
        onLoad={renderIfWanted}
        onReady={renderIfWanted}
      />
      <div ref={container} className="turnstile-box" />
    </>
  );
}
