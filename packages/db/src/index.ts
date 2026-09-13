// Public entry of @porchlight/db: the typed Supabase client and the generated database
// types. It is the only package that imports @supabase/*. Accessors in @porchlight/core
// and the read-model in apps/web reach Supabase through it (D2).
//
// database.types.ts is generated: `pnpm --filter @porchlight/db gen:types` against the
// running local stack. test/generated-types.test.ts fails when it drifts from the schema.
export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";
export { Constants } from "./database.types";
export { createBrowserDbClient } from "./createBrowserDbClient";
export { createDbClient, type DbClient } from "./createDbClient";
export {
  createSessionDbClient,
  type SessionCookie,
  type SessionCookieStore,
  type SessionCookieToSet,
} from "./createSessionDbClient";
