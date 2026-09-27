import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `email_preferences` (#22). `load` reads one member's settings,
// `store` saves them, claims the due emails, puts a failed one back, and turns email
// off from an unsubscribe link.
export interface IEmailPreferenceAccessor {
  load(request: RequestBase): Promise<ResponseBase>;
  store(request: RequestBase): Promise<ResponseBase>;
}
