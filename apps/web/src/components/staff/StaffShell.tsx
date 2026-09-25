import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./staff.module.css";

interface StaffShellProps {
  readonly current: "queue" | "reports" | "admin";
  readonly isAdmin: boolean;
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}

// The Queue board's frame for every staff page: a side menu, the page itself, and an
// optional right column (the duties card). The menu lists only pages that exist, and
// Site settings only for an admin; each route still checks the role itself.
export function StaffShell({ current, isAdmin, aside, children }: StaffShellProps) {
  return (
    <main className={styles.shell}>
      <nav aria-label="Staff" className={styles.side}>
        <p className={styles.role}>{isAdmin ? "Admin" : "Moderator"}</p>
        <ul>
          <li>
            <Link
              href="/mod/queue"
              aria-current={current === "queue" ? "page" : undefined}
            >
              Moderation queue
            </Link>
          </li>
          <li>
            <Link
              href="/mod/reports"
              aria-current={current === "reports" ? "page" : undefined}
            >
              Reports
            </Link>
          </li>
          {isAdmin && (
            <li>
              <Link href="/admin" aria-current={current === "admin" ? "page" : undefined}>
                Site settings
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div className={styles.page}>{children}</div>
      {aside !== undefined && <aside className={styles.aside}>{aside}</aside>}
    </main>
  );
}
