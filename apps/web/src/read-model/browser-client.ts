import { createBrowserDbClient, type DbClient } from "@porchlight/db";

// The one browser-side path to Supabase (D2): a Client Component's Realtime
// subscription (the notification bell, SPEC.md §8) reaches it through here, the same
// way a Server Component reaches it through this folder's other read-model functions,
// rather than a Client Component building its own client somewhere else.
//
// Next.js inlines a `NEXT_PUBLIC_*` value into the client bundle only where it sees
// the literal `process.env.NAME` expression; `readSupabasePublicEnv`'s dynamic
// `process.env[name]` lookup (fine on the server, where `process.env` is the real
// environment) would compile to `undefined` here, and that helper lives in `auth/`,
// which this folder may not import (D2's read-model/auth split). Both literals are
// read once, here, for every browser-side caller of either value to share.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The anon key alone, for a caller that never needs a full client — signing a fetch
// to a Storage URL that is already scoped to one upload (`upload-to-signed-url.ts`).
export function requireBrowserAnonKey(): string {
  if (SUPABASE_ANON_KEY === undefined) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. See docs/setup/supabase.md.",
    );
  }
  return SUPABASE_ANON_KEY;
}

let client: DbClient | undefined;

export function getBrowserDbClient(): DbClient {
  if (client !== undefined) {
    return client;
  }
  if (SUPABASE_URL === undefined) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. See docs/setup/supabase.md.");
  }
  client = createBrowserDbClient(SUPABASE_URL, requireBrowserAnonKey());
  return client;
}
