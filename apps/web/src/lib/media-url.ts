import { publicObjectUrl } from "@porchlight/core/client";

import { readSupabasePublicEnv } from "@/auth/supabase-env";

// Supabase Storage's own public-object URL. `publishedPath` already carries
// `<bucket>/<key>` (SPEC.md §7, `supabase/seed.sql`'s seeded cover); the core's
// `publicObjectUrl` adds the fixed prefix, the same one it uses to know this site's
// own videos.
export function publicMediaUrl(publishedPath: string): string {
  return publicObjectUrl(readSupabasePublicEnv().url, publishedPath);
}
