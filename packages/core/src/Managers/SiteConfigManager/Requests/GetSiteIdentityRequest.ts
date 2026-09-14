import { RequestBase } from "../../../Common/RequestBase";

// "What is this site called, and what does /about say?" Public: every visitor's page
// title, the feed header, and the branded preview card need this, so unlike
// `GetSiteConfigRequest` it carries no actor and no permission check.
export class GetSiteIdentityRequest extends RequestBase {}
