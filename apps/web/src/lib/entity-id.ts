// Every row id (a post, a comment) is a UUID. Checked at the edge so a tampered form or
// a typed URL is a 404 or a form error, never a Postgres type error logged as an outage.
// The pattern lives once, in the core. The client entry keeps this file safe to import
// from a client component.
export { isUuid as isEntityId } from "@porchlight/core/client";
