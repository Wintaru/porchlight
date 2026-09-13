import { ResponseBase } from "../../../Common/ResponseBase";

// `erase_account` committed and the auth user is gone (SPEC.md §10).
export class ProfileErasedResponse extends ResponseBase {}
