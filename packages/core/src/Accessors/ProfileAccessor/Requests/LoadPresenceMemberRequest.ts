import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// A presence report's member, and whether they let others see them (#89): one read
// where the report used to make two.
export class LoadPresenceMemberRequest extends RequestBase {
  constructor(
    readonly profileId: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
