import {
  CannotPostResponse,
  CanPostResponse,
  CheckCanPostAnonymouslyRequest,
} from "@porchlight/core";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SimplePage } from "@/components/SimplePage";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { submitAnonymousPost } from "./actions";
import { errorTextFor } from "./anonymous-post-form-messages";
import { SUMMARY_MAX_LENGTH, TITLE_MAX_LENGTH } from "./parse-anonymous-post-form";
import styles from "./new-post.module.css";

interface NewAnonymousPostPageProps {
  readonly searchParams: Promise<{ readonly error?: string }>;
}

// The anonymous write form (SPEC.md §4, D7): no sign-in, no draft phase — a visitor
// writes once and the post starts and stays `pending` until an admin approves it. A
// member is sent to the real editor instead, where their trust level decides whether
// a post publishes at once.
export default async function NewAnonymousPostPage({
  searchParams,
}: NewAnonymousPostPageProps) {
  const actor = await getCurrentActor();
  if (actor.kind === "member") {
    redirect("/write");
  }
  const allowed = await getDependencyContainer().postManager.query(
    new CheckCanPostAnonymouslyRequest(actor),
  );
  const { error } = await searchParams;
  if (!(allowed instanceof CanPostResponse)) {
    if (!(allowed instanceof CannotPostResponse)) {
      console.error(`anonymous post check failed [${allowed.correlationId}]`, allowed);
    }
    return (
      <SimplePage title="Write anonymously">
        <p className="form-status" data-testid="cannot-post">
          {allowed instanceof CannotPostResponse
            ? errorTextFor(allowed.reason)
            : "Anonymous posting is closed on this site right now."}
        </p>
      </SimplePage>
    );
  }
  const errorText = errorTextFor(error);
  return (
    <SimplePage
      title="Write anonymously"
      lead={
        <>
          Nobody sees this until an admin approves it. A cookie remembers it is yours —{" "}
          <Link href="/anon">check its status</Link> any time, and claim it once you sign
          in.
        </>
      }
    >
      {errorText !== undefined && (
        <p role="alert" className="form-alert" data-testid="form-error">
          {errorText}
        </p>
      )}
      <form action={submitAnonymousPost} className="card form-stack">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            className={`text-input ${styles.title ?? ""}`}
            type="text"
            name="title"
            maxLength={TITLE_MAX_LENGTH}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Summary</span>
          <input
            className="text-input"
            type="text"
            name="summary"
            maxLength={SUMMARY_MAX_LENGTH}
            placeholder="One line. Otherwise the first sentence is used."
          />
        </label>
        <label className="field">
          <span className="field-label">Body (markdown)</span>
          <textarea
            className={`text-input ${styles.body ?? ""}`}
            name="bodyMd"
            aria-label="Body (markdown)"
            required
          />
        </label>
        <TurnstileWidget />
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Post anonymously
          </button>
        </div>
      </form>
    </SimplePage>
  );
}
