import { ResponseBase } from "../../../Common/ResponseBase";

// Someone claimed this author already: a second sign-in with the same cookie, or a
// stale tab replaying the claim form. Not an error.
export class AnonymousAuthorAlreadyClaimedResponse extends ResponseBase {}
