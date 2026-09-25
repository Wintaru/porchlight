import type { Metadata } from "next";
import Link from "next/link";

import { SimplePage } from "@/components/SimplePage";
import { getSiteIdentity } from "@/lib/site-identity";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return { title: `Nothing here · ${siteName}` };
}

// Every 404 — an unknown path, or a page that called notFound() — in the site's shell.
export default function NotFound() {
  return (
    <SimplePage title="Nothing here" lead="There is no page at this address.">
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </SimplePage>
  );
}
