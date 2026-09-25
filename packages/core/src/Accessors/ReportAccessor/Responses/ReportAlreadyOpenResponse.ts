import { ResponseBase } from "../../../Common/ResponseBase";

// The same member already has an open or escalated report on this item for this
// reason (#56): nothing new was stored.
export class ReportAlreadyOpenResponse extends ResponseBase {}
