import { RequestBase } from "../../../Common/RequestBase";

// Whether this site sends email at all (#22), for pages that offer a subscribe form to
// anyone. No actor: the answer is the same for everybody.
export class GetEmailAvailabilityRequest extends RequestBase {}
