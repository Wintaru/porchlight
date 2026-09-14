import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";

// Unlike every other page here, nothing in this one reads a cookie or a search param,
// so Next would otherwise try to prerender it at build time — before `.env` exists for
// a fresh checkout, that attempt fails over to the fallback identity and logs noise for
// no reason. An admin's `about_md` edit (SPEC.md §4) must also be visible on the very
// next request, never held back until a rebuild.
export const dynamic = "force-dynamic";

// `/about`, a reserved route (SPEC.md §4): renders `site_config.about_md` as the admin
// wrote it. Plain text, not a markdown render — `about_md` has no cached HTML column
// the way a post's `body_md` does (D3 only caches a post's own render), and admin-only
// prose does not need a parser and a sanitizer just to keep its line breaks.
export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const title = `About · ${siteName}`;
  return {
    title,
    alternates: { canonical: `${SITE_URL}/about` },
    openGraph: { title, url: `${SITE_URL}/about`, siteName },
  };
}

export default async function AboutPage() {
  const { siteName, aboutMd } = await getSiteIdentity();
  return (
    <main
      className="container"
      style={{ maxWidth: 720, paddingTop: 40, paddingBottom: 64 }}
    >
      <h1>About {siteName}</h1>
      {aboutMd === "" ? (
        <p style={{ color: "var(--muted)" }}>Nothing here yet.</p>
      ) : (
        <p style={{ whiteSpace: "pre-wrap" }}>{aboutMd}</p>
      )}
    </main>
  );
}
