import { PostCardList } from "@/components/PostCardList";
import { createSessionClient } from "@/auth/session-client";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { loadFeed } from "@/read-model/feed";

interface HomePageProps {
  readonly searchParams: Promise<{ readonly erased?: string }>;
}

// The home feed (SPEC.md §5): every public published post, newest first. Read through
// the read-model with the session client, so RLS is the wall (D2). `erased=1` is where
// EraseAccountHandler's confirm form lands once the member's own session is gone
// (SPEC.md §10): nowhere under `/settings` can show this, since that gate now redirects
// to sign-in.
export default async function HomePage({ searchParams }: HomePageProps) {
  const posts = await loadFeed(await createSessionClient());
  const { erased } = await searchParams;
  return (
    <main>
      {erased !== undefined && (
        <p role="status" data-testid="account-erased">
          Your account has been erased.
        </p>
      )}
      <h1>{SITE_NAME}</h1>
      <p>{SITE_TAGLINE}</p>
      <h2>Latest on the porch</h2>
      <p>Newest first · no votes, no rankings</p>
      <PostCardList posts={posts} empty="Nothing on the porch yet." />
    </main>
  );
}
