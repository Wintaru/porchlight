// `site_config.site_name`, `.site_tagline`, `.about_md` (SPEC.md §4): every page title,
// the feed header, the RSS channel and the branded preview card use `site_name`; `/about`
// renders `about_md`. Read together because every caller that wants one wants all three.
export interface SiteIdentity {
  readonly siteName: string;
  readonly siteTagline: string;
  readonly aboutMd: string;
}

export const DEFAULT_SITE_IDENTITY: SiteIdentity = {
  siteName: "Porchlight",
  siteTagline: "",
  aboutMd: "",
};

export const SITE_NAME_MAX_LENGTH = 60;
export const SITE_TAGLINE_MAX_LENGTH = 140;
export const ABOUT_MD_MAX_LENGTH = 20_000;
