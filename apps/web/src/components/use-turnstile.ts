"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";

import { TURNSTILE_APPEARANCE, TURNSTILE_SIZE, turnstileSiteKey } from "@/lib/turnstile";

interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly appearance: typeof TURNSTILE_APPEARANCE;
  readonly size: typeof TURNSTILE_SIZE;
}

// Turnstile's explicit-render API (docs/setup/turnstile.md), the script's global.
interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface Turnstile {
  readonly siteKey: string | undefined;
  readonly container: RefObject<HTMLDivElement | null>;
  // For next/script's onLoad and onReady, and any other moment the widget may be wanted.
  readonly renderIfWanted: () => void;
}

// One Turnstile widget, rendered explicitly into `container`. Implicit render scans the
// page only when the script first loads, so a form that arrives by a client-side
// navigation, or after a server action redirect, would get no widget and submit no
// token. A token is single-use, so the widget resets once its form submits: a failed
// submit that stays on the page then gets a fresh token for the next try.
export function useTurnstile(isWanted: (container: HTMLElement) => boolean): Turnstile {
  const siteKey = turnstileSiteKey();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  // In a ref, so a caller's inline function cannot remove and render the widget again
  // on every render, which would drop the token.
  const isWantedRef = useRef(isWanted);
  useEffect(() => {
    isWantedRef.current = isWanted;
  });

  const renderIfWanted = useCallback(() => {
    const element = container.current;
    const api = window.turnstile;
    if (
      widgetId.current !== undefined ||
      element === null ||
      api === undefined ||
      siteKey === undefined ||
      !isWantedRef.current(element)
    ) {
      return;
    }
    widgetId.current = api.render(element, {
      sitekey: siteKey,
      appearance: TURNSTILE_APPEARANCE,
      size: TURNSTILE_SIZE,
    });
  }, [siteKey]);

  useEffect(() => {
    renderIfWanted();
    const form = container.current?.closest("form");
    // After the submit event, not during it: the form data is read from the field
    // while the event dispatches, and a reset clears the field.
    const resetAfterSubmit = () => {
      setTimeout(() => {
        if (widgetId.current !== undefined) {
          window.turnstile?.reset(widgetId.current);
        }
      });
    };
    form?.addEventListener("submit", resetAfterSubmit);
    return () => {
      form?.removeEventListener("submit", resetAfterSubmit);
      if (widgetId.current !== undefined) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = undefined;
      }
    };
  }, [renderIfWanted]);

  return { siteKey, container, renderIfWanted };
}
