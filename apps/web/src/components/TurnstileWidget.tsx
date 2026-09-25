import Script from "next/script";

import { TURNSTILE_SRC, turnstileSiteKey } from "@/lib/turnstile";

// Cloudflare Turnstile, implicit render (docs/setup/turnstile.md): the script scans the
// page for `.cf-turnstile` and injects a hidden `cf-turnstile-response` field into it,
// so the anonymous form needs no client script of its own to carry the token. An unset
// site key means the fake provider is running (TURNSTILE_SECRET_KEY empty selects it
// the same way on the server): the widget is skipped entirely rather than shown broken,
// and the form submits with no token, which the fake accepts.
export function TurnstileWidget() {
  const siteKey = turnstileSiteKey();
  if (siteKey === undefined) {
    return null;
  }
  return (
    <>
      <Script src={TURNSTILE_SRC} async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  );
}
