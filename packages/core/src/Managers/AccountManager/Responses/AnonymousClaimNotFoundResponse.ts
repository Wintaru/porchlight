import { ResponseBase } from "../../../Common/ResponseBase";

// The text was not a secret or code this store knows: cookies cleared, code mistyped,
// or the wrong browser (SPEC.md §4 — lost if the code was not saved).
export class AnonymousClaimNotFoundResponse extends ResponseBase {}
