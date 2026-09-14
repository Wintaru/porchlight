import { LOCKED_RETENTION_DAYS, REPORT_REASONS } from "@porchlight/core";
import type { Metadata } from "next";

import { REPORT_REASON_LABELS } from "@/lib/report-reason-labels";
import { getRegion } from "@/lib/region";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  const title = `Code of conduct · ${siteName}`;
  return {
    title,
    alternates: { canonical: `${SITE_URL}/code-of-conduct` },
    openGraph: { title, url: `${SITE_URL}/code-of-conduct`, siteName },
  };
}

// SPEC.md §1, §7, §10: content policy, the evidence envelope, and the region-specific
// reporting paragraph. Plain language a neighbor could have written.
export default async function CodeOfConductPage() {
  const { siteName } = await getSiteIdentity();
  const { profile: regionProfile } = await getRegion();

  return (
    <main
      className="container"
      style={{ maxWidth: 720, paddingTop: 40, paddingBottom: 64 }}
    >
      <h1>Code of conduct</h1>
      <p>How to treat other people here, and what {siteName} does not allow.</p>

      <h2>Content policy</h2>
      <p>
        No gore. No self-harm imagery. No pornography. Artistic nudity is allowed only
        after a moderator approves it and tags it mature — a mature image renders blurred
        until a reader chooses to reveal it.
      </p>

      <h2>Reporting something</h2>
      <p>
        Report a post or a comment for any of these reasons. Reporting illegal content
        sends it straight to a moderator instead of waiting in the usual queue.
      </p>
      <ul data-testid="report-reasons">
        {REPORT_REASONS.map((reason) => (
          <li key={reason} data-testid={`report-reason-${reason}`}>
            {REPORT_REASON_LABELS[reason]}
          </li>
        ))}
      </ul>

      <h2>What we collect when you post</h2>
      <p>
        Every post, comment, and upload records an evidence envelope: your IP address and
        port, the time, your browser&rsquo;s user agent, a spam-check result, and, for an
        upload, its original filename, size, and a fingerprint of its bytes. The original
        bytes of an upload are kept untouched, unlike the copy shown on the site, which
        has identifying metadata stripped before anyone sees it.
      </p>
      <p data-testid="region-ip-window">
        Your raw IP address and port are kept for {String(regionProfile.ipWindowDays)}{" "}
        days, then permanently replaced with a one-way hash that cannot be turned back
        into an IP address. Content locked for a serious investigation keeps its full
        evidence for as long as the law requires, even past an account erasure.
      </p>

      <h2>Reporting to authorities</h2>
      <p data-testid="region-reporting-target">
        This site is configured for the {regionProfile.reportingTarget}: report apparent
        illegal content there directly at {regionProfile.reportingContact}.
      </p>
      <p>{regionProfile.deadlineText}</p>
      {regionProfile.warning !== null && (
        <p role="alert" data-testid="region-warning">
          {regionProfile.warning}
        </p>
      )}
      <p data-testid="locked-retention-days">
        Regardless of region, a locked item is retained for at least{" "}
        {String(LOCKED_RETENTION_DAYS)} days, every moderation action is written to an
        audit log, and every upload is scanned before it can be seen — scanning has no off
        switch.
      </p>
    </main>
  );
}
