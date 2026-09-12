import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ProfileSelector } from "../ProfileSelector";

export class GetProfileRequest extends RequestBase {
  constructor(
    readonly selector: ProfileSelector,
    context?: RequestContext,
  ) {
    super(context);
  }
}
