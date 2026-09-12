import { readFileSync } from "node:fs";

import postgres, { type Sql, type TransactionSql } from "postgres";

// Where the tests find the local stack. The one source is .env.example at the repo root,
// which carries the local stack's addresses and its fixed keys; an environment variable
// of the same name overrides it. `KEY=VALUE` lines only, no quoting, no expansion.
const ENV_EXAMPLE = new URL("../../../.env.example", import.meta.url);

function readEnvExample(): ReadonlyMap<string, string> {
  const entries = readFileSync(ENV_EXAMPLE, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("#") && line.includes("="))
    .map((line): [string, string] => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    });
  return new Map(entries);
}

function localValue(name: string): string {
  const value = process.env[name] ?? readEnvExample().get(name);
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set in the environment or in .env.example`);
  }
  return value;
}

export const LOCAL_STACK = Object.freeze({
  databaseUrl: localValue("DATABASE_URL"),
  apiUrl: localValue("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: localValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

export const UNREACHABLE_MESSAGE =
  `The local Supabase stack is not reachable at ${LOCAL_STACK.databaseUrl}. ` +
  "Run `supabase start` (and `supabase db reset` for the seed) from the repo root. " +
  "See docs/setup/supabase.md.";

/** The Postgres roles PostgREST switches to for a request. */
export type DbRole = "anon" | "authenticated" | "service_role";

/** Postgres error code for a privilege or policy refusal. */
export const INSUFFICIENT_PRIVILEGE = "42501";
/** Postgres error code raised by a CHECK constraint and by the retention triggers. */
export const CHECK_VIOLATION = "23514";
/** Postgres error code for a duplicate key. */
export const UNIQUE_VIOLATION = "23505";
/** Postgres error code for a foreign key refusal. */
export const FOREIGN_KEY_VIOLATION = "23503";

/** The seed's fixed ids (supabase/seed.sql). */
export const SEED = Object.freeze({
  admin: "00000000-0000-4000-8000-000000000001",
  moderator: "00000000-0000-4000-8000-000000000002",
  trustedMember: "00000000-0000-4000-8000-000000000003",
  probationMember: "00000000-0000-4000-8000-000000000004",
  erasedMember: "00000000-0000-4000-8000-000000000005",
  anonymousAuthor: "00000000-0000-4000-8000-0000000000a1",
  publicPost: "00000000-0000-4000-8000-0000000000b2",
  unlistedPost: "00000000-0000-4000-8000-0000000000b3",
  draftPost: "00000000-0000-4000-8000-0000000000b4",
  pendingPost: "00000000-0000-4000-8000-0000000000b5",
  anonymousPendingPost: "00000000-0000-4000-8000-0000000000b6",
  visibleComment: "00000000-0000-4000-8000-0000000000c1",
  visibleReply: "00000000-0000-4000-8000-0000000000c2",
  tombstoneComment: "00000000-0000-4000-8000-0000000000c3",
  pendingComment: "00000000-0000-4000-8000-0000000000c5",
  publishedMedia: "00000000-0000-4000-8000-0000000000d1",
  quarantinedMedia: "00000000-0000-4000-8000-0000000000d2",
  matureTag: "00000000-0000-4000-8000-0000000000e1",
});

export function connect(): Sql {
  return postgres(LOCAL_STACK.databaseUrl, { max: 1, onnotice: () => undefined });
}

// Thrown from inside `sql.begin` so postgres.js rolls the transaction back.
class Rollback extends Error {}

/**
 * Runs `fn` as PostgREST would run a request for `role`, inside a transaction that is
 * always rolled back. `set local role` drops the connection's `postgres` role, which
 * bypasses RLS, to a role that does not, and `request.jwt.claims` is where
 * `auth.uid()` reads the subject from. Both are transaction-local, so the connection
 * comes back clean for the next test.
 */
export async function asRole<T>(
  sql: Sql,
  role: DbRole,
  fn: (tx: TransactionSql) => Promise<T>,
  sub?: string,
): Promise<T> {
  let box: { value: T } | undefined;
  const claims = JSON.stringify(sub === undefined ? { role } : { role, sub });
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(`set local role ${role}`);
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      box = { value: await fn(tx) };
      throw new Rollback();
    });
  } catch (error: unknown) {
    if (!(error instanceof Rollback)) throw error;
  }
  if (box === undefined) throw new Error("asRole: the callback produced no value");
  return box.value;
}

/** Runs `fn` and returns the Postgres error code it raised, or null when it succeeded. */
export async function errorCodeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error: unknown) {
    if (error instanceof postgres.PostgresError) return error.code;
    throw error;
  }
}
