import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { signInPathFor } from "@/lib/sign-in-path";
import { confirmErase } from "../actions";

interface EraseAccountPageProps {
  readonly searchParams: Promise<{ readonly error?: string }>;
}

const ERROR_TEXT: Readonly<Record<string, string>> = {
  "not-confirmed": "Check the box to confirm before erasing.",
  forbidden: "This account cannot be erased right now.",
  unavailable: "The account could not be erased. Try again in a moment.",
};

// The erase card and its confirmation step from the Settings board (SPEC.md §10). A
// separate page rather than a client-side confirm dialog, matching every other
// destructive action in this app: nothing here needs the browser before the member has
// actually decided.
export default async function EraseAccountPage({ searchParams }: EraseAccountPageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings/erase"));
  }
  const { error } = await searchParams;
  const errorText =
    error === undefined ? undefined : (ERROR_TEXT[error] ?? ERROR_TEXT.unavailable);
  return (
    <main>
      <h1>Erase everything</h1>
      <p>
        Deletes every post, comment, reaction and upload you made, and your profile. It is
        gone from the database and from storage, not hidden.
      </p>
      <ul>
        <li>Comments other people left on your posts go with the posts.</li>
        <li>
          Where someone replied to one of your comments, an empty [deleted] slot stays so
          their reply still makes sense.
        </li>
        <li>
          If a moderator locked an item for a legal report, its evidence is kept for the
          retention period.
        </li>
      </ul>
      {errorText !== undefined && (
        <p role="alert" data-testid="erase-error">
          {errorText}
        </p>
      )}
      <Link href="/settings/export">Export first</Link>
      <form action={confirmErase}>
        <label>
          <input type="checkbox" name="confirmed" data-testid="erase-confirm-checkbox" />{" "}
          I understand this cannot be undone.
        </label>
        <button type="submit" data-testid="erase-confirm-submit">
          Erase everything I contributed
        </button>
      </form>
    </main>
  );
}
