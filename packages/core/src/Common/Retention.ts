// Global regardless of region (SPEC.md §7): a locked item's evidence and original
// bytes are held for at least one year, no matter which region's shorter windows apply
// elsewhere. #12's region page may only ever raise this, never lower it.
export const LOCKED_RETENTION_DAYS = 365;

// The seeded default for `site_config.raw_ip_retention_days` (supabase/seed.sql) and
// the fallback both SiteConfigAccessor implementations answer for a missing row —
// one constant so a future change to the default cannot update only one of them.
export const DEFAULT_RAW_IP_RETENTION_DAYS = 90;

// "No trustworthy address was available" (docs/setup/turnstile.md's
// `TRUST_FORWARDED_FOR`), never a made-up address. Shared between apps/web's
// request-meta helper and the media accessor that turns this sentinel into a null
// `inet` column, so the two sides cannot drift on the literal.
export const UNTRUSTED_CLIENT_IP = "unknown";
