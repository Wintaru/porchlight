import type { DutyChecklistItem, DutyChecklistStatus } from "@porchlight/core";
import Link from "next/link";

import styles from "./staff.module.css";

interface DutyCardProps {
  readonly region: string;
  readonly items: readonly DutyChecklistItem[];
}

// The Queue board's "Your duties": each safety duty with a filled box when a real
// provider answers, an empty one while a fake does in development, and a red one when
// a fake is answering in production. The full checklist, with guides, is on /admin.
const STATUS_TEXT: Readonly<Record<DutyChecklistStatus, string>> = {
  configured: " (active)",
  fake: " (not yet active: a fake answers, fine for local development)",
  fakeInProduction: " (not active: a fake is answering in production)",
};
export function DutyCard({ region, items }: DutyCardProps) {
  return (
    <section className={styles.duties} aria-labelledby="duties-heading">
      <div className={styles.dutiesHead}>
        <h2 id="duties-heading">Your duties</h2>
        <span className="chip">{region}</span>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-status={item.status}>
            <span className={styles.box} aria-hidden="true" />
            <span>
              {item.label}
              <span className="visually-hidden">{STATUS_TEXT[item.status]}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link href="/admin#duties">Setup guides →</Link>
    </section>
  );
}
