// Every row id (a post, a comment) is a UUID. Checked at the edge so a tampered form or
// a typed URL is a 404 or a form error, never a Postgres type error logged as an outage.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEntityId(value: string): boolean {
  return UUID.test(value);
}
