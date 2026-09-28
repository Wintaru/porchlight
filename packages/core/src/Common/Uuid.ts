// Every row id, Supabase Auth user id and OAuth client id is a UUID. Checked at each
// edge before a store query, so a malformed value is a plain "no" instead of a Postgres
// type error logged as an outage. The one copy of the pattern: apps/web re-exports it
// as `isEntityId` through the client entry.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
