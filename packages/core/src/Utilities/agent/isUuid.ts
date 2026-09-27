// A Supabase Auth user id and an OAuth client id are both UUIDs. Checked before a store
// query, so a malformed claim is a plain "no" instead of a Postgres type error logged as
// an outage.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
