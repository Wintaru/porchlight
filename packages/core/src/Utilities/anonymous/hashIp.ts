import { sha256Hex } from "./sha256Hex";

// The salted address hash the block list and the rate limiter key on (D15, D17). The
// shape `salt:ip` is the one the seed uses, so a seeded block matches a live request.
export function hashIp(salt: string, ip: string): Promise<string> {
  return sha256Hex(`${salt}:${ip}`);
}
