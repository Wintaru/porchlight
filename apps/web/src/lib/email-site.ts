import type { EmailSite } from "@porchlight/core";

import { SITE_URL } from "./site";
import { getSiteIdentity } from "./site-identity";

// Who the site's email is from and where its links point (#22).
export async function getEmailSite(): Promise<EmailSite> {
  const { siteName } = await getSiteIdentity();
  return { name: siteName, url: SITE_URL };
}
