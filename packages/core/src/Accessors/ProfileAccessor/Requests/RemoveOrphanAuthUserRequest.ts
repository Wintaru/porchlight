import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Deletes the auth user `id` only when it has no profile (#92). A first sign-in that the
// `sign_up` rule refuses leaves Supabase Auth with a user and no profile: an invite
// email opened in another browser, or Google on a closed site. The handler reads the
// profile again right before the delete, and a member is never touched.
export class RemoveOrphanAuthUserRequest extends RequestBase {
  constructor(
    readonly id: string,
    context?: RequestContext,
  ) {
    super(context);
  }
}
