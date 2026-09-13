import { readSupabasePublicEnv } from "@/auth/supabase-env";

// Supabase Storage's own public-object URL shape. `publishedPath` already carries
// `<bucket>/<key>` (SPEC.md §7, `supabase/seed.sql`'s seeded cover), so this only adds
// the fixed `/storage/v1/object/public/` prefix — no accessor builds this yet (#36).
export function publicMediaUrl(publishedPath: string): string {
  return `${readSupabasePublicEnv().url}/storage/v1/object/public/${publishedPath}`;
}
