import { AboutPageResponse, GetAboutPageRequest } from "@porchlight/core";
import type { Metadata } from "next";

import { getDependencyContainer } from "@/lib/dependency-container";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";

// Unlike every other page here, nothing in this one reads a cookie or a search param,
// so Next would otherwise try to prerender it at build time — before `.env` exists for
// a fresh checkout, that attempt fails over to the fallback identity and logs noise for
// no reason. An admin's `about_md` edit (SPEC.md §4) must also be visible on the very
// next request, never held back until a rebuild.
export const dynamic = "force-dynamic";

// `/about`, a reserved route (SPEC.md §4): renders `site_config.about_md` as markdown,
// through the same sanitizing render path as a post body (GetAboutPageHandler). The
// admin form labels the field "About (markdown)", so plain text broke that promise.
export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const title = `About · ${siteName}`;
  return {
    title,
    alternates: { canonical: `${SITE_URL}/about` },
    openGraph: { title, url: `${SITE_URL}/about`, siteName },
  };
}

// Same resilience as `getSiteIdentity`: a `site_config` hiccup shows the empty state,
// never an error page.
async function loadAboutHtml(): Promise<string> {
  try {
    const response = await getDependencyContainer().siteConfigManager.query(
      new GetAboutPageRequest(),
    );
    if (response instanceof AboutPageResponse) {
      return response.aboutHtml;
    }
    console.error("about page load failed", response);
    return "";
  } catch (error: unknown) {
    console.error("about page load failed", error);
    return "";
  }
}

export default async function AboutPage() {
  const [{ siteName }, aboutHtml] = await Promise.all([
    getSiteIdentity(),
    loadAboutHtml(),
  ]);
  return (
    <main
      className="container"
      style={{ maxWidth: 720, paddingTop: 40, paddingBottom: 64 }}
    >
      <h1>About {siteName}</h1>
      {aboutHtml === "" ? (
        <p style={{ color: "var(--muted)" }}>Nothing here yet.</p>
      ) : (
        <div
          className="prose"
          data-testid="about-body"
          // Sanitized by the render engine's allowlist, the same one a post body uses.
          dangerouslySetInnerHTML={{ __html: aboutHtml }}
        />
      )}
    </main>
  );
}
