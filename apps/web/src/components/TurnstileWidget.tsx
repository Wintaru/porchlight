import Script from "next/script";

// Cloudflare Turnstile, implicit render (docs/setup/turnstile.md): the script scans the
// page for `.cf-turnstile` and injects a hidden `cf-turnstile-response` field into it,
// so the anonymous form needs no client script of its own to carry the token. An unset
// site key means the fake provider is running (TURNSTILE_SECRET_KEY empty selects it
// the same way on the server): the widget is skipped entirely rather than shown broken,
// and the form submits with no token, which the fake accepts.
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (siteKey === undefined || siteKey === "") {
    return null;
  }
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  );
}
