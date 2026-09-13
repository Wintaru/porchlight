import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "Show me the whole site configuration, the region's wired defaults, and the duty
// checklist." Admin-only (SPEC.md §4, §7).
export class GetSiteConfigRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    context?: RequestContext,
  ) {
    super(context);
  }
}
