import { RequestBase } from "../../../Common/RequestBase";

// "What does /about say, ready to show?" Public, like `GetSiteIdentityRequest`: no actor
// and no permission check. Kept apart from that request so the markdown render runs on
// `/about` only, never on the site-identity read that every page makes.
export class GetAboutPageRequest extends RequestBase {}
