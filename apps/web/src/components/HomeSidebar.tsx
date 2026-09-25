import type { Actor } from "@porchlight/core";
import Link from "next/link";

import type { TagPage } from "@/read-model/tag";

import styles from "./HomeSidebar.module.css";

interface HomeSidebarProps {
  readonly actor: Actor;
  readonly mayWriteAnonymously: boolean;
  readonly tags: readonly TagPage[];
}

// The Main board's right rail: a welcome card for a signed-out visitor, an invitation
// to post without an account when the site allows it (D20), and the tag cloud. Any
// piece with nothing to show (a signed-in member, `posting` set to `members`/`staff`,
// a site with no tags yet) just does not render — the sidebar can end up empty on a
// brand-new solo blog, which is fine.
export function HomeSidebar({ actor, mayWriteAnonymously, tags }: HomeSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="About this porch">
      {actor.kind === "visitor" && (
        <div className={`card ${styles.welcomeCard ?? ""}`}>
          <h2>Leave the light on</h2>
          <p>Newest posts first, no votes, no rankings.</p>
          <Link href="/about">How this place works →</Link>
        </div>
      )}
      {tags.length > 0 && (
        <div className="card">
          <p className={styles.tagsLabel}>Tags</p>
          <ul className={styles.tagCloud} data-testid="tag-cloud">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Link className="chip" href={`/t/${tag.slug}`}>
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {mayWriteAnonymously && (
        <div className={styles.callout}>
          <p>Posting without an account?</p>
          <Link href="/p/new">Write anonymously →</Link>
        </div>
      )}
    </aside>
  );
}
