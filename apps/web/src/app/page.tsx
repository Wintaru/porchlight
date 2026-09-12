import { PostCardList } from "@/components/PostCardList";
import { createSessionClient } from "@/auth/session-client";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { loadFeed } from "@/read-model/feed";

// The home feed (SPEC.md §5): every public published post, newest first. Read through
// the read-model with the session client, so RLS is the wall (D2).
export default async function HomePage() {
  const posts = await loadFeed(await createSessionClient());
  return (
    <main>
      <h1>{SITE_NAME}</h1>
      <p>{SITE_TAGLINE}</p>
      <h2>Latest on the porch</h2>
      <p>Newest first · no votes, no rankings</p>
      <PostCardList posts={posts} empty="Nothing on the porch yet." />
    </main>
  );
}
