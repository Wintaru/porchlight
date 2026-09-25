"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

import { TURNSTILE_SRC, turnstileSiteKey } from "@/lib/turnstile";

// Turnstile's explicit-render API (docs/setup/turnstile.md), the script's global.
interface TurnstileApi {
  render(container: HTMLElement, options: { readonly sitekey: string }): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
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
  const siteKey = turnstileSiteKey();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  const renderIfOpen = useCallback(() => {
    const element = container.current;
    const api = window.turnstile;
    if (
      widgetId.current !== undefined ||
      element === null ||
      api === undefined ||
      siteKey === undefined ||
      element.closest("details")?.open !== true
    ) {
      return;
    }
    widgetId.current = api.render(element, { sitekey: siteKey });
  }, [siteKey]);

  useEffect(() => {
    const details = container.current?.closest("details");
    if (details === null || details === undefined) {
      return;
    }
    details.addEventListener("toggle", renderIfOpen);
    renderIfOpen();
    return () => {
      details.removeEventListener("toggle", renderIfOpen);
      if (widgetId.current !== undefined) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = undefined;
      }
    };
  }, [renderIfOpen]);

  if (siteKey === undefined) {
    return null;
  }
  return (
    <>
      <Script
        src={TURNSTILE_SRC}
        async
        defer
        onLoad={renderIfOpen}
        onReady={renderIfOpen}
      />
      <div ref={container} />
    </>
  );
}
