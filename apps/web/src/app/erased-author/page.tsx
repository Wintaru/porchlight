import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SimplePage } from "@/components/SimplePage";
import { ERASED_AUTHOR_HEADER } from "@/lib/erased-author";
import { getSiteIdentity } from "@/lib/site-identity";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return { title: `Gone · ${siteName}`, robots: { index: false } };
}

// What /@handle and /@handle/<slug> show for an erased author (D11). The proxy rewrites
// those paths here with a 410 status and the header below. Opened directly, without
// the header, this path is a 404 like any other unknown page.
export default async function ErasedAuthorPage() {
  if ((await headers()).get(ERASED_AUTHOR_HEADER) === null) {
    notFound();
  }
  return (
    <SimplePage
      title="This author is gone"
      lead="They erased their account, and their posts and profile went with it."
    >
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </SimplePage>
  );
}
