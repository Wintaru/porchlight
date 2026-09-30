import Link from "next/link";

import { SimplePage } from "@/components/SimplePage";

// What an erased author's pages show (D11): the proxy's 410 rewrite on a page load, and
// the author and post pages themselves on a client-side navigation, which the proxy
// leaves alone.
export function AuthorGone() {
  return (
    <SimplePage
      title="This author is gone"
      lead="They erased their account, and their posts and profile went with it."
    >
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </SimplePage>
  );
}
