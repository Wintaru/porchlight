import { ResponseBase } from "../../../Common/ResponseBase";

// A locked verdict (SPEC.md §7, issue #31): "a plain refusal with no detail beyond
// refused" — never a reason, so an uploader can never tell a lock from any other
// refusal. The real reason lives only in the audit_log entry the scan pipeline writes.
export class MediaRefusedResponse extends ResponseBase {}
