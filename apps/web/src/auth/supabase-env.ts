// The two public Supabase values the session client needs. Both are `NEXT_PUBLIC_` on
// purpose: the anon key is public by design and RLS is the wall (docs/setup/supabase.md).
export interface SupabasePublicEnv {
  readonly url: string;
  readonly anonKey: string;
}

export function readSupabasePublicEnv(): SupabasePublicEnv {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. See docs/setup/supabase.md.`);
  }
  return value;
}
