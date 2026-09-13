import { RequestBase } from "../../../Common/RequestBase";

// Reads `site_config.site_name`, `.site_tagline` and `.about_md` in one round trip
// (SPEC.md §4): every caller that wants one wants all three.
export class LoadSiteIdentityRequest extends RequestBase {}
