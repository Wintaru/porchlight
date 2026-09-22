import type { AgentGuardAction } from "../AgentGuardAction";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// "May this token do this again today?" The request's timestamp is the day it counts
// against, so one clock decides both the window and the reset time in the answer.
export class AdmitAgentActionRequest extends RequestBase {
  constructor(
    readonly tokenId: string,
    readonly action: AgentGuardAction,
    context?: RequestContext,
  ) {
    super(context);
  }
}
