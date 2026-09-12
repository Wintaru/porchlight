import type { Actor } from "../../../Common/Actor";
import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Signed in later, a member claims what an anonymous cookie or claim code wrote
// (SPEC.md §4). `secretOrCode` is either shape: the handler normalizes before hashing.
export class ClaimAnonymousPostsRequest extends RequestBase {
  constructor(
    readonly actor: Actor & { readonly kind: "member" },
    readonly secretOrCode: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
