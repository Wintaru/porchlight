import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

export class GetMediaRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly mediaId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
