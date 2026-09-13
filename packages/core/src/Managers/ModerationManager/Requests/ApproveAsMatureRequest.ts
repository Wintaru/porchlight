import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Artistic nudity is approved with this mandatory tag (SPEC.md §7). Targets the media
// asset directly — the mod_actions row this writes has its own `target_media_id`
// column for exactly this.
export class ApproveAsMatureRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
