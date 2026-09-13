import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { SiteConfigSnapshot } from "../SiteConfigSnapshot";

// "Save these fields." Only the fields present are validated and written; every other
// `site_config` key is untouched. Admin-only (SPEC.md §4, §7).
export class SaveSiteConfigRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly update: Partial<SiteConfigSnapshot>,
    context?: RequestContext,
  ) {
    super(context);
  }
}
