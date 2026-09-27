import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every mute and block one member made, oldest first. For the export bundle.
export class LoadMemberBlocksByMemberRequest extends RequestBase {
  constructor(
    readonly memberId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
