import type { ReactNode } from "react";

import styles from "./simple-page.module.css";

interface SimplePageProps {
  readonly title: string;
  // One muted line under the title: what this page is for.
  readonly lead?: ReactNode;
  readonly children?: ReactNode;
}

// The one-column page the boards use for everything that is not a feed, a post, the
// editor, settings or the queue: anonymous writing and status, sign-in, errors. A
// centred column, a serif title, and the content in a stack under it.
export function SimplePage({ title, lead, children }: SimplePageProps) {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1>{title}</h1>
        {lead !== undefined && <p className={styles.lead}>{lead}</p>}
      </header>
      {children}
    </main>
  );
}
