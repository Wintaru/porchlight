import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SessionBar } from "@/components/SessionBar";
import { newsreader, sourceSans } from "@/fonts/fonts";
import { getSiteIdentity } from "@/lib/site-identity";

import "./globals.css";

// A plain string, not a title.template: every page below already formats its own full
// title as `<page> · <siteName>`, and a template would double that suffix.
export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteTagline } = await getSiteIdentity();
  return { title: siteName, description: siteTagline };
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    // The font variables must sit on <html>: globals.css reads them in :root.
    <html lang="en" className={`${newsreader.variable} ${sourceSans.variable}`}>
      <body>
        <SessionBar />
        {children}
      </body>
    </html>
  );
}
