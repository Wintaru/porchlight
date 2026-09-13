import type { AuditLogEntry } from "../../../Common/AuditLogEntry";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AuditLogListResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly entries: readonly AuditLogEntry[],
  ) {
    super(correlationId);
  }
}
