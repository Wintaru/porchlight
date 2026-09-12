import { createDbClient, type DbClient } from "@porchlight/db";

import type { Environment } from "./Environment";

// The service-role client: server only, bypasses RLS, which is what an Accessor is for
// (D2). Both values come from `supabase start` locally and from the project settings
// in production (docs/setup/supabase.md). Built once and shared by every Supabase
// accessor in the container.
export function createServiceDbClient(env: Environment): DbClient {
  const url = requireEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  return createDbClient(url, key);
}

function requireEnv(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. See docs/setup/supabase.md.`);
  }
  return value;
}
