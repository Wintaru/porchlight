import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// Turns what an email is about into the message itself: subject, plain text, HTML and
// the unsubscribe link (#22). Pure: no I/O, so every wording rule is tested here.
export interface IEmailComposeEngine {
  transform(request: RequestBase): Promise<ResponseBase>;
}
