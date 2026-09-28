import { ResponseBase } from "../../../Common/ResponseBase";

// The re-render's start point is not a row id, or its budget is not a whole number of
// at least one (#98). Nothing was read.
export class CommentRerenderRejectedResponse extends ResponseBase {}
