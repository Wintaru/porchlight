import { RequestBase } from "../../../Common/RequestBase";

// Every active admin and moderator (SPEC.md §8): who a `queue.pending` or
// `report.filed` notification fans out to.
export class ListStaffProfilesRequest extends RequestBase {}
