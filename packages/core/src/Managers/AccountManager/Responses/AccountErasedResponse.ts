import { ResponseBase } from "../../../Common/ResponseBase";

// The account is gone (SPEC.md §10): content erased, profile blanked, auth user
// deleted. The Client's session cookie is now for a user that no longer exists — it
// signs the browser out itself rather than reading anything more off this response.
export class AccountErasedResponse extends ResponseBase {}
