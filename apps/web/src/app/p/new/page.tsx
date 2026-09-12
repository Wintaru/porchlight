import {
  CannotPostResponse,
  CanPostResponse,
  CheckCanPostAnonymouslyRequest,
} from "@porchlight/core";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TurnstileWidget } from "@/components/TurnstileWidget";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { submitAnonymousPost } from "./actions";
import { errorTextFor } from "./anonymous-post-form-messages";
import { SUMMARY_MAX_LENGTH, TITLE_MAX_LENGTH } from "./parse-anonymous-post-form";

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
      <main>
        <h1>Write anonymously</h1>
        <p data-testid="cannot-post">
          {allowed instanceof CannotPostResponse
            ? errorTextFor(allowed.reason)
            : "Anonymous posting is closed on this site right now."}
        </p>
      </main>
    );
  }
  const errorText = errorTextFor(error);
  return (
    <main>
      <h1>Write anonymously</h1>
      <p>
        Nobody sees this until an admin approves it. A cookie remembers it is yours —{" "}
        <Link href="/anon">check its status</Link> any time, and claim it once you sign
        in.
      </p>
      {errorText !== undefined && (
        <p role="alert" data-testid="form-error">
          {errorText}
        </p>
      )}
      <form action={submitAnonymousPost}>
        <label>
          Title
          <input type="text" name="title" maxLength={TITLE_MAX_LENGTH} required />
        </label>
        <label>
          Summary
          <input type="text" name="summary" maxLength={SUMMARY_MAX_LENGTH} />
        </label>
        <label>
          Body (markdown)
          <textarea name="bodyMd" aria-label="Body (markdown)" required />
        </label>
        <TurnstileWidget />
        <button type="submit">Post anonymously</button>
      </form>
    </main>
  );
}
