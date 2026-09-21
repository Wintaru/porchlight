import { ResponseBase } from "../../../Common/ResponseBase";

// Nothing behind the token: unknown, revoked, expired, or its member is not active.
// One answer for all four, so the door never says which.
export class NoAgentActorResponse extends ResponseBase {}
