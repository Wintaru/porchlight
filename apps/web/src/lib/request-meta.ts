import { UNTRUSTED_CLIENT_IP } from "@porchlight/core";
import { headers } from "next/headers";

// What any Server Function can know about the caller's address and agent, member or
// visitor alike (SPEC.md §7's evidence envelope). `x-forwarded-for` is only trustworthy
// behind a reverse proxy that overwrites or strips whatever a client sends before
// appending its own view of the connection (docs/deploy.md, docs/setup/turnstile.md) —
// left unset, `TRUST_FORWARDED_FOR` keeps every caller sharing one sentinel address
// instead of letting a spoofed header pass for a real one.
export interface RequestMeta {
  readonly clientIp: string;
  readonly userAgent: string | undefined;
}

export async function currentRequestMeta(): Promise<RequestMeta> {
  const list = await headers();
  return {
    clientIp: clientIpFrom(list),
    userAgent: list.get("user-agent") ?? undefined,
  };
}

export function clientIpFrom(list: Headers): string {
  if (process.env.TRUST_FORWARDED_FOR !== "true") {
    return UNTRUSTED_CLIENT_IP;
  }
  const forwardedFor = list.get("x-forwarded-for");
  // An empty header is no address: "" would be one more address every such caller
  // shares, so it falls through like a missing one.
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first !== undefined && first !== "") {
    return first;
  }
  const realIp = list.get("x-real-ip");
  return realIp !== null && realIp !== "" ? realIp : UNTRUSTED_CLIENT_IP;
}
