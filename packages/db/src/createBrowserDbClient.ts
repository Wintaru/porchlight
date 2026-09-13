import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import type { DbClient } from "./createDbClient";

/**
 * Builds the Supabase client for a Client Component (SPEC.md §8's realtime bell): reads
 * the same session cookies the server set, so it acts as the signed-in member under RLS.
 * Always the anon key.
 */
export function createBrowserDbClient(url: string, anonKey: string): DbClient {
  return createBrowserClient<Database>(url, anonKey);
}
