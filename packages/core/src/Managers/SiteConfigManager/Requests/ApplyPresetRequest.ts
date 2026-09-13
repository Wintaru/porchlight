import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { SiteConfigPreset } from "../../../Common/SiteConfigPreset";

// "Apply this preset." Writes only `posting`, `comments` and `sign_up` — the three D20
// keys the preset defines — and leaves every other setting alone (SPEC.md §4).
export class ApplyPresetRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly preset: SiteConfigPreset,
    context?: RequestContext,
  ) {
    super(context);
  }
}
