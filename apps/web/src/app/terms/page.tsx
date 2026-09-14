import type { Metadata } from "next";
import Link from "next/link";

import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";

// Unlike every other page here, nothing in this one reads a cookie or a search param,
// so Next would otherwise try to prerender it at build time — before `.env` exists for
// a fresh checkout, that attempt fails over to the fallback identity and logs noise for
// no reason. An admin's `site_name` edit must also be visible on the very next request,
// never held back until a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const title = `Terms · ${siteName}`;
  return {
    title,
    alternates: { canonical: `${SITE_URL}/terms` },
    openGraph: { title, url: `${SITE_URL}/terms`, siteName },
  };
}

// SPEC.md §1, §10: the ownership principle and what happens to content at erasure. Plain
// language a neighbor could have written, not a lawyer's draft.
export default async function TermsPage() {
  const { siteName } = await getSiteIdentity();
  return (
    <main
      className="container"
      style={{ maxWidth: 720, paddingTop: 40, paddingBottom: 64 }}
    >
      <h1>Terms</h1>

      <h2>You own what you write</h2>
      <p>
        Copyright to your posts, comments, and uploads stays with you, always. {siteName}{" "}
        never resells your content, never licenses it out, and never trains an AI model on
        it.
      </p>
      <p>
        You can export everything you have written at any time, as markdown and JSON, with
        no waiting period. You can also erase your account at any time. Erasure deletes
        your content — it does not just hide it.
      </p>
      <p>
        The MIT license that covers this project&rsquo;s source code applies only to the
        code. It does not apply to anything you write here.
      </p>

      <h2>What erasure does</h2>
      <p>When you erase your account:</p>
      <ul>
        <li>Every post you wrote is deleted, along with every comment on it.</li>
        <li>
          A comment you wrote on someone else&rsquo;s post is replaced with a tombstone if
          anyone replied to it, so their replies stay readable. A comment with no replies
          is deleted outright.
        </li>
        <li>Every upload you made is deleted.</li>
        <li>Your profile is marked erased and your personal details are cleared.</li>
      </ul>
      <p>
        One thing does not go away: evidence frozen for a moderation investigation, as
        described on the <Link href="/code-of-conduct">code of conduct page</Link>. That
        evidence outlives an erasure, even yours.
      </p>
    </main>
  );
}
