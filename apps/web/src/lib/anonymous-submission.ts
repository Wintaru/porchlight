import type { AnonymousSubmission } from "@porchlight/core";
import { headers } from "next/headers";

import { readAnonymousSecret } from "@/lib/anonymous-cookie";

// What a Server Function knows about the visitor behind an anonymous write, before any
// store is asked (D15). `x-forwarded-for` is only trustworthy behind a reverse proxy
// that overwrites or strips whatever a client sends before appending its own view of
// the connection (docs/deploy.md, docs/setup/turnstile.md) — Porchlight is
// self-hostable with no such guarantee, so trusting it by default would let a flood
// send a fresh `X-Forwarded-For` on every request and skip the IP block list and the
// per-IP rate limit entirely. `TRUST_FORWARDED_FOR` opts in once that proxy exists;
// left unset, every anonymous visitor shares one bucket, which degrades gracefully
// under real traffic instead of being bypassable.
export async function currentAnonymousSubmission(
  turnstileToken: string | undefined,
): Promise<AnonymousSubmission> {
  const [secret, list] = await Promise.all([readAnonymousSecret(), headers()]);
  return {
    secret,
    turnstileToken,
    clientIp: clientIpFrom(list),
    userAgent: list.get("user-agent") ?? undefined,
  };
}

const UNTRUSTED_IP = "unknown";

function clientIpFrom(list: Headers): string {
  if (process.env.TRUST_FORWARDED_FOR !== "true") {
    return UNTRUSTED_IP;
  }
  const forwardedFor = list.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? list.get("x-real-ip") ?? UNTRUSTED_IP;
}
