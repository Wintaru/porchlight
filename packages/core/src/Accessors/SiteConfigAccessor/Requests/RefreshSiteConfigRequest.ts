import { RequestBase } from "../../../Common/RequestBase";

// Drops this server's copy of `site_config`, so the next reads come from the table. The
// admin form saves every field at once, so it must start from what is stored now, not
// from a copy up to SITE_CONFIG_TTL_MS old that another server's save made stale.
export class RefreshSiteConfigRequest extends RequestBase {}
