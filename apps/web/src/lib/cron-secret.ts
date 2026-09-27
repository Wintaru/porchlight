import { timingSafeEqual } from "node:crypto";

// Whether a request carries `Authorization: Bearer <CRON_SECRET>`, the header Vercel Cron
// sends and the one docs/deploy.md tells pg_cron to send. With no secret set, nothing
// passes: the scheduled routes are off rather than open.
export function carriesCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret === "") {
    return false;
  }
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Compared in constant time, so the answer's timing says nothing about the secret.
  return given.length === expected.length && timingSafeEqual(given, expected);
}
