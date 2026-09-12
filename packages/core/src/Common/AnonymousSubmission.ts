// What the Client knows about an anonymous write before any store is asked (D15). The
// secret is the `porchlight_anon` cookie when the browser has one; a first write has
// none. The Turnstile token is the widget's hidden field, absent when the fake runs.
// The address and agent feed the salted hash and, with #10, the evidence envelope.
export interface AnonymousSubmission {
  readonly secret: string | undefined;
  readonly turnstileToken: string | undefined;
  readonly clientIp: string;
  readonly userAgent: string | undefined;
}
