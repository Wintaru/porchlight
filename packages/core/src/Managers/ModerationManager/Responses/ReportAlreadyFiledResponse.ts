import { ResponseBase } from "../../../Common/ResponseBase";

// The member's same report on the same item is still open (#56). Nothing new was
// stored and no moderator was notified again; to the member it reads as sent.
export class ReportAlreadyFiledResponse extends ResponseBase {}
