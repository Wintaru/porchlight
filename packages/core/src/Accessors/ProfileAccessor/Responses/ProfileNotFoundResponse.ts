import { ResponseBase } from "../../../Common/ResponseBase";

// No row for that id or handle. Not a failure: the store answered.
export class ProfileNotFoundResponse extends ResponseBase {}
