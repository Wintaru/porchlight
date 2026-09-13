import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { SiteConfigEntry } from "../SiteConfigEntry";

// Writes one or more `site_config` rows in one round trip (SPEC.md §4, §7). Every
// admin-page save funnels through here, whatever mix of keys it touches, instead of one
// request per key: the single caller (SiteConfigManager) always has several keys to
// save at once.
export class StoreSiteConfigEntriesRequest extends RequestBase {
  constructor(
    readonly entries: readonly SiteConfigEntry[],
    readonly updatedBy: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
