// One `site_config` row to write: the raw column shape, jsonb value included. The
// caller (SiteConfigManager) has already validated the value against its domain type;
// this Accessor only persists it.
export interface SiteConfigEntry {
  readonly key: string;
  readonly value: unknown;
}
