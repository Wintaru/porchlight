"use client";

import Script from "next/script";

import { useTurnstile } from "@/components/use-turnstile";
import { TURNSTILE_SRC } from "@/lib/turnstile";

function always(): boolean {
  return true;
}

// Cloudflare Turnstile on an anonymous form (docs/setup/turnstile.md): the widget puts a
// hidden `cf-turnstile-response` field inside its container, so the form carries the
// token with no client script of its own. An unset site key means the fake provider is
// running (TURNSTILE_SECRET_KEY empty selects it the same way on the server): the widget
// is skipped entirely rather than shown broken, and the form submits with no token,
// which the fake accepts.
export function TurnstileWidget() {
  const { siteKey, container, renderIfWanted } = useTurnstile(always);
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
      <div ref={container} className="turnstile-box" data-testid="turnstile-widget" />
    </>
  );
}
