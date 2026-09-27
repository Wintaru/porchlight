import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Runs the draft check (SPEC.md §17, #32) on markdown the caller is writing, against
// the caller's own voice guide. For the editor and the check_draft tool alike.
export class CheckDraftRequest extends RequestBase {
  constructor(
    readonly actor: Actor,
    readonly bodyMd: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
