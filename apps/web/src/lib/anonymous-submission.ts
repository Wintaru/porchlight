import type { AnonymousSubmission } from "@porchlight/core";

import { readAnonymousSecret } from "@/lib/anonymous-cookie";
import { currentRequestMeta } from "@/lib/request-meta";

// What a Server Function knows about the visitor behind an anonymous write, before any
// store is asked (D15). The secret is the `porchlight_anon` cookie when the browser has
// one; a first write has none. The Turnstile token is the widget's hidden field, absent
// when the fake runs. The address and agent come from the same request-meta helper
// #10's evidence envelope uses for a member's own upload.
export async function currentAnonymousSubmission(
  turnstileToken: string | undefined,
): Promise<AnonymousSubmission> {
  const [secret, meta] = await Promise.all([readAnonymousSecret(), currentRequestMeta()]);
  return {
    secret,
    turnstileToken,
    clientIp: meta.clientIp,
    userAgent: meta.userAgent,
  };
}
