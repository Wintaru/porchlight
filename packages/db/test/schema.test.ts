import type { Sql, TransactionSql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  asRole,
  CHECK_VIOLATION,
  connect,
  errorCodeOf,
  FOREIGN_KEY_VIOLATION,
  INSUFFICIENT_PRIVILEGE,
  SEED,
  UNIQUE_VIOLATION,
} from "./local-stack";

// The constraints SPEC.md §5, §7 and issue #3 call out by name, exercised as the service
// role (the only writer). Each test runs in its own rolled-back transaction.

let sql: Sql;

beforeAll(() => {
  sql = connect();
});

afterAll(async () => {
  await sql.end();
});

const asService = <T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> =>
  asRole(sql, "service_role", fn);

describe("posts", () => {
  test("need exactly one author", async () => {
    const both = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.posts (author_id, anonymous_author_id, slug, title)
          values (${SEED.trustedMember}, ${SEED.anonymousAuthor}, 'two-authors', 'x')
        `,
      ),
    );
    const neither = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.posts (slug, title) values ('no-author', 'x')
        `,
      ),
    );
    expect(both).toBe(CHECK_VIOLATION);
    expect(neither).toBe(CHECK_VIOLATION);
  });

  test("published posts carry a published_at", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.posts set status = 'published', published_at = null
          where id = ${SEED.draftPost}
        `,
      ),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("slugs are globally unique", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.posts (author_id, slug, title)
          values (${SEED.trustedMember}, 'hello-from-the-porch', 'x')
        `,
      ),
    );
    expect(code).toBe(UNIQUE_VIOLATION);
  });
});

describe("comments", () => {
  test("need exactly one author unless they are a tombstone", async () => {
    const authoredTombstone = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.comments (post_id, author_id, status, body_md)
          values (${SEED.publicPost}, ${SEED.trustedMember}, 'tombstone', '')
        `,
      ),
    );
    const orphanVisible = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.comments (post_id, status, body_md)
          values (${SEED.publicPost}, 'visible', 'x')
        `,
      ),
    );
    expect(authoredTombstone).toBe(CHECK_VIOLATION);
    expect(orphanVisible).toBe(CHECK_VIOLATION);
  });

  test("depth comes from the parent, whatever the insert says", async () => {
    const rows = await asService(
      (tx) => tx<{ depth: number }[]>`
        insert into public.comments (post_id, parent_id, author_id, depth, body_md)
        values (${SEED.publicPost}, ${SEED.visibleReply}, ${SEED.trustedMember}, 5, 'x')
        returning depth
      `,
    );
    expect(rows[0]?.depth).toBe(2);

    const root = await asService(
      (tx) => tx<{ depth: number }[]>`
        insert into public.comments (post_id, author_id, depth, body_md)
        values (${SEED.publicPost}, ${SEED.trustedMember}, 3, 'x')
        returning depth
      `,
    );
    expect(root[0]?.depth).toBe(0);
  });

  test("depth 6 is the floor of the thread (D10)", async () => {
    // Grow a chain under the seed's depth-1 reply: depths 2..6 succeed, 7 fails.
    const code = await errorCodeOf(() =>
      asService(async (tx) => {
        let parent: string = SEED.visibleReply;
        for (let depth = 2; depth <= 6; depth += 1) {
          const [row] = await tx<{ id: string; depth: number }[]>`
            insert into public.comments (post_id, parent_id, author_id, body_md)
            values (${SEED.publicPost}, ${parent}, ${SEED.trustedMember}, 'x')
            returning id, depth
          `;
          if (row === undefined) throw new Error("insert returned no row");
          expect(row.depth).toBe(depth);
          parent = row.id;
        }
        await tx`
          insert into public.comments (post_id, parent_id, author_id, body_md)
          values (${SEED.publicPost}, ${parent}, ${SEED.trustedMember}, 'one too deep')
        `;
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("a tombstone keeps no rendered body either", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.comments
          set status = 'tombstone', author_id = null, body_md = ''
          where id = ${SEED.visibleComment}
        `,
      ),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("a comment with replies cannot be hard-deleted (D5)", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`delete from public.comments where id = ${SEED.visibleComment}`,
      ),
    );
    expect(code).toBe(FOREIGN_KEY_VIOLATION);
  });

  test("deleting a post takes its comments with it (D6), even after moderation", async () => {
    const remaining = await asService(async (tx) => {
      await tx`
        insert into public.mod_actions (actor_id, action, target_post_id)
        values (${SEED.moderator}, 'approve', ${SEED.publicPost})
      `;
      await tx`delete from public.posts where id = ${SEED.publicPost}`;
      return tx<
        { n: number }[]
      >`select count(*)::int as n from public.comments where post_id = ${SEED.publicPost}`;
    });
    expect(remaining[0]?.n).toBe(0);
  });
});

describe("reactions", () => {
  test("one reaction of a kind per member per item", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.reactions (post_id, profile_id, kind)
          values (${SEED.publicPost}, ${SEED.admin}, 'heart')
        `,
      ),
    );
    expect(code).toBe(UNIQUE_VIOLATION);
  });
});

describe("retention (§7)", () => {
  test("a locked media asset cannot be deleted before retain_until", async () => {
    const code = await errorCodeOf(() =>
      asService(async (tx) => {
        await tx`
          update public.media_assets
          set scan_status = 'locked', retain_until = now() + interval '1 year'
          where id = ${SEED.quarantinedMedia}
        `;
        await tx`delete from public.media_assets where id = ${SEED.quarantinedMedia}`;
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("a published copy needs a clear or flagged scan, never pending or locked", async () => {
    const pending = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.media_assets set published_path = 'public-media/x.jpg'
          where id = ${SEED.quarantinedMedia}
        `,
      ),
    );
    const flagged = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.media_assets
          set scan_status = 'flagged', published_path = 'public-media/x.jpg'
          where id = ${SEED.quarantinedMedia}
        `,
      ),
    );
    expect(pending).toBe(CHECK_VIOLATION);
    expect(flagged).toBeNull();
  });

  test("truncate is refused on the retained tables", async () => {
    for (const table of ["media_assets", "submission_evidence", "audit_log"]) {
      const code = await errorCodeOf(() =>
        asService((tx) => tx.unsafe(`truncate public.${table} cascade`)),
      );
      expect({ table, code }).toEqual({ table, code: CHECK_VIOLATION });
    }
  });

  test("a locked media asset needs a retain_until", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.media_assets set scan_status = 'locked'
          where id = ${SEED.quarantinedMedia}
        `,
      ),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("frozen evidence cannot be deleted before retain_until", async () => {
    const code = await errorCodeOf(() =>
      asService(async (tx) => {
        await tx`
          update public.submission_evidence
          set frozen = true, retain_until = now() + interval '1 year'
          where subject_id = ${SEED.anonymousPendingPost}
        `;
        await tx`delete from public.submission_evidence where subject_id = ${SEED.anonymousPendingPost}`;
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("expired raw addresses are nulled, current and frozen ones kept (#62)", async () => {
    const rows = await asService(async (tx) => {
      const insert = (requestId: string, expiresInDays: number, frozen: boolean) => tx`
        insert into public.submission_evidence (
          subject_kind, subject_id, anonymous_author_id, source_ip, source_port,
          raw_ip_expires_at, ip_hash, turnstile_result, request_id, frozen, retain_until
        ) values (
          'post', ${SEED.anonymousPendingPost}, ${SEED.anonymousAuthor}, '203.0.113.9',
          51234, now() + make_interval(days => ${expiresInDays}), 'hash', 'pass',
          ${requestId}, ${frozen},
          case when ${frozen} then now() + interval '1 year' end
        )
      `;
      await insert("expired", -1, false);
      await insert("current", 1, false);
      await insert("frozen", -1, true);
      const [swept] = await tx<{ cleared: number }[]>`
        select public.null_expired_raw_ips() as cleared
      `;
      const kept = await tx<
        {
          request_id: string;
          source_ip: string | null;
          source_port: number | null;
          ip_hash: string;
        }[]
      >`
        select request_id, host(source_ip) as source_ip, source_port, ip_hash
        from public.submission_evidence
        where request_id in ('expired', 'current', 'frozen')
        order by request_id
      `;
      return { cleared: swept?.cleared, kept };
    });

    expect(rows.cleared).toBe(1);
    expect(rows.kept).toEqual([
      {
        request_id: "current",
        source_ip: "203.0.113.9",
        source_port: 51234,
        ip_hash: "hash",
      },
      { request_id: "expired", source_ip: null, source_port: null, ip_hash: "hash" },
      {
        request_id: "frozen",
        source_ip: "203.0.113.9",
        source_port: 51234,
        ip_hash: "hash",
      },
    ]);
  });

  test("the raw-address sweep is scheduled, and browser roles cannot run it", async () => {
    const [job] = await sql<{ schedule: string; command: string }[]>`
      select schedule, command from cron.job where jobname = 'null-expired-raw-ips'
    `;
    expect(job).toEqual({
      schedule: "17 3 * * *",
      command: "select public.null_expired_raw_ips()",
    });
    for (const role of ["anon", "authenticated"] as const) {
      const code = await errorCodeOf(() =>
        asRole(sql, role, (tx) => tx`select public.null_expired_raw_ips()`),
      );
      expect({ role, code }).toEqual({ role, code: INSUFFICIENT_PRIVILEGE });
    }
  });

  test("the audit log is append-only", async () => {
    const update = await errorCodeOf(() =>
      asService((tx) => tx`update public.audit_log set event = 'x'`),
    );
    const del = await errorCodeOf(() =>
      asService((tx) => tx`delete from public.audit_log`),
    );
    expect(update).toBe(CHECK_VIOLATION);
    expect(del).toBe(CHECK_VIOLATION);
  });
});

describe("profiles", () => {
  test("an erased profile carries no personal fields", async () => {
    const code = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.profiles set status = 'erased' where id = ${SEED.probationMember}
        `,
      ),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });
});
