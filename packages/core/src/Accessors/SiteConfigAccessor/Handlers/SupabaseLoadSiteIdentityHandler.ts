import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { DEFAULT_SITE_IDENTITY, type SiteIdentity } from "../../../Common/SiteIdentity";
import type { LoadSiteIdentityRequest } from "../Requests/LoadSiteIdentityRequest";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";
import { SiteIdentityLoadedResponse } from "../Responses/SiteIdentityLoadedResponse";

const SITE_NAME_KEY = "site_name";
const SITE_TAGLINE_KEY = "site_tagline";
const ABOUT_MD_KEY = "about_md";
const IDENTITY_KEYS = [SITE_NAME_KEY, SITE_TAGLINE_KEY, ABOUT_MD_KEY];

// One round trip for all three keys (SPEC.md §4): a caller that wants the site's
// identity wants it whole, never one field at a time. A row missing from the result
// falls back to its own default rather than failing the other two.
export class SupabaseLoadSiteIdentityHandler implements IHandler<
  LoadSiteIdentityRequest,
  SiteIdentityLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadSiteIdentityRequest,
  ): Promise<SiteIdentityLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("key, value")
      .in("key", IDENTITY_KEYS);
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    const byKey = new Map(data.map((row) => [row.key, row.value]));
    const identity: SiteIdentity = {
      siteName: stringOr(byKey.get(SITE_NAME_KEY), DEFAULT_SITE_IDENTITY.siteName),
      siteTagline: stringOr(
        byKey.get(SITE_TAGLINE_KEY),
        DEFAULT_SITE_IDENTITY.siteTagline,
      ),
      aboutMd: stringOr(byKey.get(ABOUT_MD_KEY), DEFAULT_SITE_IDENTITY.aboutMd),
    };
    return new SiteIdentityLoadedResponse(request.correlationId, identity);
  }
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
