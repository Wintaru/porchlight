import type { Metadata } from "next";
import Link from "next/link";

import { createSessionClient } from "@/auth/session-client";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadAllTags } from "@/read-model/tag";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const title = `Tags · ${siteName}`;
  return { title, alternates: { canonical: `${SITE_URL}/tags` } };
}

// The header's "Tags" (Main board): every tag, each a way into its own page. The home
// sidebar's cloud stops at 24, and a phone does not show it at all.
export default async function TagsPage() {
  const tags = await loadAllTags(await createSessionClient());
  return (
    <main
      className="container"
      style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 64 }}
    >
      <h1>Tags</h1>
      {tags.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No tags yet.</p>
      ) : (
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: 0,
            listStyle: "none",
          }}
        >
          {tags.map((tag) => (
            <li key={tag.id}>
              <Link className="chip" href={`/t/${tag.slug}`}>
                {tag.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
