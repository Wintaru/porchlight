import { ResponseBase } from "../../../Common/ResponseBase";

// This deployment sends no email (EMAIL_PROVIDER unset or `none`). Nothing was sent, and
// nothing failed: the caller keeps what it would have sent for a later try.
export class EmailDisabledResponse extends ResponseBase {}
