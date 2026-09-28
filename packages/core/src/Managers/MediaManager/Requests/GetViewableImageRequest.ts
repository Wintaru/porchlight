import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// The quarantine original of an image, in a form any browser shows (#90): a HEIC photo
// comes back as a JPEG of the same pixels, the same copy the scanners get (#21). For
// the moderator deciding a held image, which has no public copy to look at.
export class GetViewableImageRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
