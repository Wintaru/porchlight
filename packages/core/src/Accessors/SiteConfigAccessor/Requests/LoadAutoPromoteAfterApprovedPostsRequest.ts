import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.auto_promote_after_approved_posts` (SPEC.md §4). A missing key
// answers the default, `null` (off).
export class LoadAutoPromoteAfterApprovedPostsRequest extends RequestBase {}
