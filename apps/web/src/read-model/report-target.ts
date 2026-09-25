import type { DbClient } from "@porchlight/db";

// The item a report names, spelled here rather than imported: the read model reads
// the database directly and does not reach into the core layers.
interface ReportTargetRef {
  readonly kind: "post" | "comment";
  readonly id: string;
}

// What the report page names before a visitor reports it (#40): a post's title, or a
// comment's words and its post's title. Read under the reader's own session, so only
// an item they can already see can be reported from here — anything else is a 404.
export type ReportTargetView =
  | { readonly kind: "post"; readonly title: string }
  | { readonly kind: "comment"; readonly bodyHtml: string; readonly postTitle: string };

export async function loadReportTarget(
  db: DbClient,
  target: ReportTargetRef,
): Promise<ReportTargetView | undefined> {
  if (target.kind === "post") {
    const { data, error } = await db
      .from("posts")
      .select("title")
      .eq("id", target.id)
      .maybeSingle();
    if (error) {
      throw new Error(`report target post ${target.id}: ${error.message}`);
    }
    return data === null ? undefined : { kind: "post", title: data.title };
  }
  const { data, error } = await db
    .from("comments")
    .select("body_html, status, post:posts!inner(title)")
    .eq("id", target.id)
    .maybeSingle();
  if (error) {
    throw new Error(`report target comment ${target.id}: ${error.message}`);
  }
  // A tombstone has no words left to report.
  if (data === null || data.status === "tombstone") {
    return undefined;
  }
  return { kind: "comment", bodyHtml: data.body_html, postTitle: data.post.title };
}
