import Link from "next/link";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { canPost, canPostAnonymously } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { SITE_NAME } from "@/lib/site";

// The header on every page: the site name, and either a Google sign-in button or the
// member's handle with the write, settings and sign-out links. A Server Component: it
// reads the session on the server and the buttons post to Server Functions. The Write
// link shows only when the PostManager says this actor may post — a member's own
// editor, or the anonymous form when the site's `posting` key allows it (D20).
export async function SessionBar() {
  const actor = await getCurrentActor();
  const [mayWrite, mayWriteAnonymously] = await Promise.all([
    canPost(actor),
    canPostAnonymously(actor),
  ]);
  return (
    <header>
      <nav aria-label="Site">
        <Link href="/">{SITE_NAME}</Link>
      </nav>
      {actor.kind === "member" ? (
        <nav aria-label="Account">
          <span data-testid="session-handle">@{actor.profile.handle}</span>
          {mayWrite && <Link href="/write">Write</Link>}
          <Link href="/settings">Settings</Link>
          <form action={signOut}>
            <button type="submit">Sign out</button>
          </form>
        </nav>
      ) : (
        <nav aria-label="Account">
          {mayWriteAnonymously && <Link href="/p/new">Write</Link>}
          <Link href="/anon">Your anonymous activity</Link>
          <form action={signInWithGoogle}>
            <button type="submit">Sign in with Google</button>
          </form>
        </nav>
      )}
    </header>
  );
}
