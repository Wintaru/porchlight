import { RequestBase } from "../../../Common/RequestBase";

// "Which region's reporting rules apply, and what do they say?" Public: the code of
// conduct page (SPEC.md §7, §10) needs this for every visitor, so unlike
// `GetSiteConfigRequest` it carries no actor and no permission check.
export class GetRegionRequest extends RequestBase {}
