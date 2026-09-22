import { ResponseBase } from "../../../Common/ResponseBase";

// An agent token is over its daily cap (SPEC.md §17, D22). Names the cap and when it
// resets, so the agent can tell its member instead of retrying.
export class PostRateLimitedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly limit: number,
    readonly resetAt: Date,
  ) {
    super(correlationId);
  }
}
