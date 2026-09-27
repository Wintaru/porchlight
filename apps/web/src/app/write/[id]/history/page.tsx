import {
  ListPostRevisionsRequest,
  NoSuchPostResponse,
  type Post,
  PostForbiddenResponse,
  type PostRevision,
  PostRevisionsResponse,
} from "@porchlight/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SimplePage } from "@/components/SimplePage";
import { classNames } from "@/lib/class-names";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { formatDate } from "@/lib/format-date";
import { foldUnchanged, lineDiff } from "@/lib/line-diff";
import { signInPathFor } from "@/lib/sign-in-path";

import styles from "./history.module.css";

interface HistoryPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

// The words a reader saw, as one text: title, summary, body. Diffing this shows a title
// or summary edit beside the body edits, in the order a reader meets them.
interface Version {
  readonly title: string;
  readonly summary: string | null;
  readonly bodyMd: string;
}

function textOf(version: Version): string {
  return [`# ${version.title}`, version.summary ?? "", version.bodyMd].join("\n\n");
}

// A post's history (#23): each earlier version readers saw, newest first, with how the
// next version readers saw differs from it. Edits made while the post was taken down
// have no version of their own, so they show inside the next one. Only someone who may edit the post gets here (the Manager
// answers NoSuchPost otherwise, the same 404 as the editor).
export default async function HistoryPage({ params }: HistoryPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(`/write/${id}/history`));
  }
  if (!isEntityId(id)) {
    notFound();
  }
  const response = await getDependencyContainer().postManager.query(
    new ListPostRevisionsRequest(actor, id),
  );
  if (
    response instanceof NoSuchPostResponse ||
    response instanceof PostForbiddenResponse
  ) {
    notFound();
  }
  if (!(response instanceof PostRevisionsResponse)) {
    console.error(`post history failed [${response.correlationId}]`, response);
    throw new Error("The history could not be loaded. Try again in a moment.");
  }
  const { post, revisions } = response;
  return (
    <SimplePage
      title="History"
      lead={
        <>
          Earlier versions of <Link href={`/write/${post.id}`}>{post.title}</Link> that
          readers saw. Drafts keep no history.
        </>
      }
    >
      {revisions.length === 0 ? (
        <p data-testid="history-empty">No earlier versions yet.</p>
      ) : (
        <ol className={styles.list} data-testid="history">
          {revisions.map((revision, index) => (
            <li key={revision.id} data-testid="history-entry">
              <RevisionChange
                revision={revision}
                next={revisions[index - 1] ?? post}
                nextIsCurrent={index === 0}
              />
            </li>
          ))}
        </ol>
      )}
    </SimplePage>
  );
}

function RevisionChange({
  revision,
  next,
  nextIsCurrent,
}: {
  readonly revision: PostRevision;
  readonly next: Version | Post;
  readonly nextIsCurrent: boolean;
}) {
  const lines = foldUnchanged(lineDiff(textOf(revision), textOf(next)));
  return (
    <section className={styles.entry}>
      <h2 className={styles.when}>
        Changed {formatDate(revision.replacedAt.toISOString())}
        {nextIsCurrent && (
          <span className={styles.current}> · to the current version</span>
        )}
      </h2>
      <pre className={styles.diff} data-testid="history-diff">
        {lines.map((line, index) =>
          line.kind === "fold" ? (
            <span key={index} className={styles.fold}>
              {`… ${String(line.count)} unchanged ${line.count === 1 ? "line" : "lines"}\n`}
            </span>
          ) : (
            <span
              key={index}
              className={classNames(
                line.kind === "added" && styles.added,
                line.kind === "removed" && styles.removed,
              )}
              data-kind={line.kind}
            >
              {`${line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}${line.text}\n`}
            </span>
          ),
        )}
      </pre>
    </section>
  );
}
