import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SessionBar } from "@/components/SessionBar";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_TAGLINE,
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionBar />
        {children}
      </body>
    </html>
  );
}
