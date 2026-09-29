import type { Metadata } from "next";

import { getSiteIdentity } from "./site-identity";

// A page's title as every page formats it, `<page> · <siteName>` (#113). The root layout
// sets no title.template, so the page gives the whole string.
export async function pageTitle(name: string): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return { title: `${name} · ${siteName}` };
}
