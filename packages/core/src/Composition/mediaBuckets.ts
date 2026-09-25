import type { Environment } from "./Environment";

// The two Storage buckets (SPEC.md §6, D4), named once for every composition file that
// needs them. The defaults match supabase/migrations/20260912215700_storage_buckets.sql
// and the local seed entries in supabase/config.toml; a self-hoster may rename either.
const DEFAULT_QUARANTINE_BUCKET = "quarantine";
const DEFAULT_PUBLIC_BUCKET = "public-media";

export function quarantineBucketOf(env: Environment): string {
  return env.STORAGE_BUCKET_QUARANTINE ?? DEFAULT_QUARANTINE_BUCKET;
}

export function publicBucketOf(env: Environment): string {
  return env.STORAGE_BUCKET_PUBLIC ?? DEFAULT_PUBLIC_BUCKET;
}
