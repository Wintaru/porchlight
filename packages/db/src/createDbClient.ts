import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/** A Supabase client typed against the generated schema. */
export type DbClient = SupabaseClient<Database>;

/**
 * Builds a typed Supabase client. With the anon key it sees only what RLS opens (the
 * read-model path, D2). With the service-role key it bypasses RLS and must stay on the
 * server (the Accessor path). Neither key is read from the environment here: the caller
 * decides which key it holds.
 */
export function createDbClient(url: string, key: string): DbClient {
  return createClient<Database>(url, key, {
    auth: {
      // The server holds no user session, and the browser client is built elsewhere
      // with the cookie-aware helpers. Nothing here should touch storage or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
