import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.raw_ip_retention_days` (SPEC.md §7), seeded to 90. Region-gated:
// #12 will vary this per region; until then every deployment shares the one seeded row.
export class LoadRawIpRetentionDaysRequest extends RequestBase {}
