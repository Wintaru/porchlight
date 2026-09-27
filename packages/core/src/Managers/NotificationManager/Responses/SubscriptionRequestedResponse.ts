import { ResponseBase } from "../../../Common/ResponseBase";

// The same answer whether a confirmation went out, went out minutes ago, or the address
// had already confirmed: the page never tells anyone whether an address is subscribed.
export class SubscriptionRequestedResponse extends ResponseBase {}
