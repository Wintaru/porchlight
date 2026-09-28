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

  test("erasure removes a member's evidence but keeps frozen rows (#63)", async () => {
    const left = await asService(async (tx) => {
      const insert = (requestId: string, frozen: boolean) => tx`
        insert into public.submission_evidence (
          subject_kind, subject_id, author_id, raw_ip_expires_at, ip_hash,
          turnstile_result, request_id, frozen, retain_until
        ) values (
          'post', ${SEED.publicPost}, ${SEED.trustedMember}, now(), 'hash',
          'not_required', ${requestId}, ${frozen},
          case when ${frozen} then now() + interval '1 year' end
        )
      `;
      await insert("theo-plain", false);
      await insert("theo-frozen", true);
      // The seed's anonymous author, as if Theo had claimed it: its row goes too.
      await tx`
        update public.anonymous_authors
        set claimed_by = ${SEED.trustedMember}, claimed_at = now()
        where id = ${SEED.anonymousAuthor}
      `;
      await tx`select public.erase_account(${SEED.trustedMember})`;
      return tx<{ request_id: string }[]>`
        select request_id from public.submission_evidence
        where request_id in ('theo-plain', 'theo-frozen', 'seed-request-1')
      `;
    });
    expect(left.map((row) => row.request_id)).toEqual(["theo-frozen"]);
  });

  test("an agent's original draft is frozen once written (#29)", async () => {
    const first = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          update public.posts set agent_draft_md = 'first' where id = ${SEED.draftPost}
        `,
      ),
    );
    const second = await errorCodeOf(() =>
      asService(async (tx) => {
        await tx`update public.posts set agent_draft_md = 'first' where id = ${SEED.draftPost}`;
        await tx`update public.posts set agent_draft_md = 'second' where id = ${SEED.draftPost}`;
      }),
    );
    const body = await errorCodeOf(() =>
      asService(async (tx) => {
        await tx`update public.posts set agent_draft_md = 'first' where id = ${SEED.draftPost}`;
        await tx`update public.posts set body_md = 'edited' where id = ${SEED.draftPost}`;
      }),
    );
    expect({ first, second, body }).toEqual({
      first: null,
      second: CHECK_VIOLATION,
      body: null,
    });
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

describe("auth.users (#67)", () => {
  // As the migration owner, in a transaction that is always rolled back: the browser
  // roles and the service role cannot write auth.users at all.
  async function passwordAfter(
    confirmedAtInsert: boolean,
    change: (tx: TransactionSql, id: string) => Promise<unknown>,
  ): Promise<string | null> {
    let found: string | null | undefined;
    await sql
      .begin(async (tx) => {
        const [row] = await tx<{ id: string }[]>`
          insert into auth.users (id, email, encrypted_password, email_confirmed_at)
          values (gen_random_uuid(), 'pre-registered@example.com', 'a-strangers-hash',
                  ${confirmedAtInsert ? new Date() : null})
          returning id
        `;
        if (row === undefined) throw new Error("no auth.users row");
        await change(tx, row.id);
        const [after] = await tx<{ encrypted_password: string | null }[]>`
          select encrypted_password from auth.users where id = ${row.id}
        `;
        found = after?.encrypted_password ?? null;
        throw new RolledBack();
      })
      .catch((error: unknown) => {
        if (!(error instanceof RolledBack)) throw error;
      });
    if (found === undefined) throw new Error("the check did not run");
    return found;
  }

  test("confirming an address drops a password set before it was confirmed", async () => {
    const password = await passwordAfter(
      false,
      (tx, id) => tx`update auth.users set email_confirmed_at = now() where id = ${id}`,
    );

    expect(password).toBeNull();
  });

  test("an account written already confirmed keeps its password", async () => {
    const password = await passwordAfter(
      true,
      (tx, id) => tx`update auth.users set last_sign_in_at = now() where id = ${id}`,
    );

    expect(password).toBe("a-strangers-hash");
  });
});

class RolledBack extends Error {}

// Issue #22: the sweep claims each due email once, and a failed send puts it back.
describe("claim_member_emails (#22)", () => {
  interface Claim {
    readonly profile_id: string;
    readonly kind: string;
    readonly counts: Record<string, number>;
  }

  async function arrange(tx: TransactionSql, queueImmediate: boolean): Promise<void> {
    await tx`
      select public.set_email_preferences(${SEED.moderator}, 'hourly', ${queueImmediate})
    `;
    await tx`
      update public.email_preferences
      set digest_cursor = now() - interval '2 hours',
          queue_cursor = now() - interval '2 hours'
      where profile_id = ${SEED.moderator}
    `;
    await tx`update public.notifications set read_at = now() where recipient_id = ${SEED.moderator}`;
    await tx`
      insert into public.notifications (recipient_id, kind, payload) values
        (${SEED.moderator}, 'reply.created', '{}'),
        (${SEED.moderator}, 'reply.created', '{}'),
        (${SEED.moderator}, 'queue.pending', '{}')
    `;
  }

  const claim = (tx: TransactionSql) => tx<Claim[]>`
    select profile_id, kind, counts
    from public.claim_member_emails(now() + interval '1 minute', 50)
    where profile_id = ${SEED.moderator}
    order by kind
  `;

  test("claims a due digest once, with counts by kind", async () => {
    const [first, second] = await asService(async (tx) => {
      await arrange(tx, false);
      return [await claim(tx), await claim(tx)];
    });
    expect(first).toEqual([
      {
        profile_id: SEED.moderator,
        kind: "digest",
        counts: { "reply.created": 2, "queue.pending": 1 },
      },
    ]);
    expect(second).toEqual([]);
  });

  test("the queue goes apart for staff who want it at once", async () => {
    const claims = await asService(async (tx) => {
      await arrange(tx, true);
      return claim(tx);
    });
    expect(claims.map(({ kind, counts }) => ({ kind, counts }))).toEqual([
      { kind: "digest", counts: { "reply.created": 2 } },
      { kind: "queue", counts: { "queue.pending": 1 } },
    ]);
  });

  test("a digest is not due before its interval, and a release puts a window back", async () => {
    const [early, again] = await asService(async (tx) => {
      await arrange(tx, false);
      const until = await tx<{ at: Date }[]>`select now() + interval '1 minute' as at`;
      const at = until[0]?.at;
      const [claimed] = await tx<{ window_start: Date; window_end: Date }[]>`
        select window_start, window_end
        from public.claim_member_emails(${at ?? null}, 50)
        where profile_id = ${SEED.moderator}
      `;
      await tx`
        insert into public.notifications (recipient_id, kind, payload)
        values (${SEED.moderator}, 'reply.created', '{}')
      `;
      const early = await claim(tx);
      await tx`
        select public.release_member_email(
          ${SEED.moderator}, 'digest', ${claimed?.window_start ?? null},
          ${claimed?.window_end ?? null}
        )
      `;
      return [early, await claim(tx)];
    });
    expect(early).toEqual([]);
    expect(again.map((row) => row.kind)).toEqual(["digest"]);
  });

  test("one call puts back a member's digest and queue windows together (#86)", async () => {
    const [released, again, stale] = await asService(async (tx) => {
      await arrange(tx, true);
      // A JavaScript Date keeps milliseconds only, so the window end is cut to them, as
      // the sweep's own `until` is. A release matches the cursor exactly.
      const claims = await tx<
        { profile_id: string; kind: string; window_start: Date; window_end: Date }[]
      >`
        select profile_id, kind, window_start, window_end
        from public.claim_member_emails(
          date_trunc('milliseconds', now() + interval '1 minute'), 50
        )
        where profile_id = ${SEED.moderator}
      `;
      const payload = claims.map((c) => ({
        profile_id: c.profile_id,
        kind: c.kind,
        window_start: c.window_start.toISOString(),
        window_end: c.window_end.toISOString(),
      }));
      const [{ released } = { released: 0 }] = await tx<{ released: number }[]>`
        select public.release_member_emails(${tx.json(payload)}) as released
      `;
      const again = await claim(tx);
      // A later claim moved the cursors on: the old windows stay where they are.
      const [{ released: stale } = { released: -1 }] = await tx<{ released: number }[]>`
        select public.release_member_emails(${tx.json(payload)}) as released
      `;
      return [released, again.map((row) => row.kind), stale];
    });
    expect([released, again, stale]).toEqual([2, ["digest", "queue"], 0]);
  });

  test("erasure removes the member's email settings", async () => {
    const left = await asService(async (tx) => {
      await tx`select public.set_email_preferences(${SEED.trustedMember}, 'daily', false)`;
      await tx`select public.erase_account(${SEED.trustedMember})`;
      return tx`
        select 1 from public.email_preferences where profile_id = ${SEED.trustedMember}
      `;
    });
    expect(left.length).toBe(0);
  });
});

// Issue #22, D20: a reader's subscription is double opt-in, and the sweep mails each
// announced post once.
// How often, and how many times, the race test (#84) looks for the second request
// waiting on the row lock.
const RACE_POLL_MS = 20;
const RACE_LOCK_TRIES = 250;

describe("subscribers (#22)", () => {
  const request = (tx: TransactionSql, token: string, author: string | null = null) =>
    tx<{ answer: string }[]>`
      select public.request_subscription('reader@example.test', 'hourly', ${token}, ${author})
        as answer
    `.then((rows) => rows[0]?.answer);

  test("asks once, holds a repeat for ten minutes, and leaves a confirmed one alone", async () => {
    const answers = await asService(async (tx) => {
      const first = await request(tx, "t1");
      const again = await request(tx, "t2");
      const [{ ok } = { ok: false }] = await tx<{ ok: boolean }[]>`
        select public.confirm_subscription('t1') as ok
      `;
      const [{ ok: twice } = { ok: true }] = await tx<{ ok: boolean }[]>`
        select public.confirm_subscription('t1') as ok
      `;
      return [first, again, ok, twice, await request(tx, "t3")];
    });
    expect(answers).toEqual(["pending", "recent", true, false, "confirmed"]);
  });

  test("an address subscribes to the site and to an author separately", async () => {
    const answers = await asService(async (tx) => [
      await request(tx, "a1"),
      await request(tx, "a2", SEED.trustedMember),
    ]);
    expect(answers).toEqual(["pending", "pending"]);
  });

  test("the sweep claims a reader once a post they follow is announced", async () => {
    const [before, claimed, again] = await asService(async (tx) => {
      await request(tx, "c1", SEED.trustedMember);
      await tx`select public.confirm_subscription('c1')`;
      await tx`
        update public.subscribers set cursor = now() - interval '3 hours'
        where email = 'reader@example.test'
      `;
      const before = await tx`select 1 from public.claim_subscriber_emails(now(), 10)`;
      await tx`
        update public.posts set announced_at = now() - interval '1 hour'
        where id = ${SEED.publicPost}
      `;
      const claimed = await tx<{ author_id: string }[]>`
        select author_id from public.claim_subscriber_emails(now(), 10)
      `;
      const again = await tx`select 1 from public.claim_subscriber_emails(now(), 10)`;
      return [before.length, claimed, again.length];
    });
    expect(before).toBe(0);
    expect(claimed).toEqual([{ author_id: SEED.trustedMember }]);
    expect(again).toBe(0);
  });

  test("a failed send releases the pending row, and never a confirmed one (#86)", async () => {
    const [released, left, again, confirmedReleased] = await asService(async (tx) => {
      await request(tx, "r1");
      const [{ released } = { released: false }] = await tx<{ released: boolean }[]>`
        select public.release_subscription_confirmation('r1') as released
      `;
      const left = await tx`
        select 1 from public.subscribers where email = 'reader@example.test'
      `;
      // The reader asks again at once: no ten-minute hold after a failed send.
      const again = await request(tx, "r2");
      await tx`select public.confirm_subscription('r2')`;
      await tx`
        update public.subscribers set confirm_token = 'r2'
        where email = 'reader@example.test'
      `;
      const [{ released: kept } = { released: true }] = await tx<{ released: boolean }[]>`
        select public.release_subscription_confirmation('r2') as released
      `;
      return [released, left.length, again, kept];
    });
    expect([released, left, again, confirmedReleased]).toEqual([
      true,
      0,
      "pending",
      false,
    ]);
  });

  test("one call puts back every reader window of a failed send (#86)", async () => {
    const [released, again] = await asService(async (tx) => {
      await request(tx, "b1");
      await request(tx, "b2", SEED.trustedMember);
      await tx`select public.confirm_subscription('b1')`;
      await tx`select public.confirm_subscription('b2')`;
      await tx`
        update public.subscribers set cursor = now() - interval '3 hours'
        where email = 'reader@example.test'
      `;
      await tx`
        update public.posts set announced_at = now() - interval '1 hour'
        where id = ${SEED.publicPost}
      `;
      const claims = await tx<
        { subscriber_id: string; window_start: Date; window_end: Date }[]
      >`
        select subscriber_id, window_start, window_end
        from public.claim_subscriber_emails(
          date_trunc('milliseconds', now() + interval '1 minute'), 10
        )
        where email = 'reader@example.test'
      `;
      const payload = claims.map((c) => ({
        subscriber_id: c.subscriber_id,
        window_start: c.window_start.toISOString(),
        window_end: c.window_end.toISOString(),
      }));
      const [{ released } = { released: 0 }] = await tx<{ released: number }[]>`
        select public.release_subscriber_emails(${tx.json(payload)}) as released
      `;
      const again = await tx`
        select 1 from public.claim_subscriber_emails(now(), 10)
        where email = 'reader@example.test'
      `;
      return [released, again.length];
    });
    expect([released, again]).toEqual([2, 2]);
  });

  // Two requests for a new address at the same moment (#84): neither finds a row to
  // lock, so both insert, and the second lands on the conflict branch. It needs two
  // connections, so the rows are committed; the finally block removes them.
  test("a second request at the same moment keeps the first one's link", async () => {
    const email = `race-${String(Date.now())}@example.test`;
    const other = connect();
    const watcher = connect();
    const ask = (db: Sql | TransactionSql, token: string) =>
      db<{ answer: string }[]>`
        select public.request_subscription(${email}, 'daily', ${token}) as answer
      `.then((rows) => rows[0]?.answer);
    const waitForLock = async (pid: number) => {
      for (let tries = 0; tries < RACE_LOCK_TRIES; tries += 1) {
        const [row] = await watcher<{ waiting: boolean }[]>`
          select wait_event_type = 'Lock' as waiting from pg_stat_activity where pid = ${pid}
        `;
        if (row?.waiting === true) return;
        await new Promise((resolve) => setTimeout(resolve, RACE_POLL_MS));
      }
      throw new Error("the second request never waited on the row lock");
    };
    try {
      let second: Promise<string | undefined> = Promise.resolve(undefined);
      const first = await sql.begin(async (tx) => {
        const answer = await ask(tx, "race-1");
        // The second request waits on the first one's uncommitted row. Commit only once
        // it does, or it would find the row at the top and never reach the conflict.
        const [{ pid } = { pid: 0 }] = await other<{ pid: number }[]>`
          select pg_backend_pid() as pid
        `;
        second = ask(other, "race-2");
        await waitForLock(pid);
        return answer;
      });
      const rows = await sql<{ confirm_token: string }[]>`
        select confirm_token from public.subscribers where email = ${email}
      `;
      expect([first, await second, rows]).toEqual([
        "pending",
        "recent",
        [{ confirm_token: "race-1" }],
      ]);
    } finally {
      await sql`delete from public.subscribers where email = ${email}`;
      await other.end();
      await watcher.end();
    }
  });

  test("erasing an author removes the subscriptions to them", async () => {
    const left = await asService(async (tx) => {
      await request(tx, "e1", SEED.trustedMember);
      await tx`select public.erase_account(${SEED.trustedMember})`;
      return tx`select 1 from public.subscribers where author_id = ${SEED.trustedMember}`;
    });
    expect(left.length).toBe(0);
  });
});

// Issue #32: every change to a voice guide keeps the text it replaced, up to 50, and
// erasure keeps none.
describe("voice_guide_revisions (#32)", () => {
  const guides = (tx: TransactionSql) => tx<{ guide_md: string }[]>`
    select guide_md from public.voice_guide_revisions
    where profile_id = ${SEED.trustedMember}
  `;

  test("keeps the replaced text, not an unchanged save or a first guide", async () => {
    const kept = await asService(async (tx) => {
      for (const text of ["one", "one", "two"]) {
        await tx`
          update public.profiles set voice_guide_md = ${text}
          where id = ${SEED.trustedMember}
        `;
      }
      await tx`update public.profiles set bio = 'x' where id = ${SEED.trustedMember}`;
      return guides(tx);
    });
    expect(kept.map((row) => row.guide_md).filter((text) => text === "one")).toEqual([
      "one",
    ]);
  });

  test("keeps at most 50 versions", async () => {
    const kept = await asService(async (tx) => {
      for (let i = 0; i < 55; i += 1) {
        await tx`
          update public.profiles set voice_guide_md = ${`v${String(i)}`}
          where id = ${SEED.trustedMember}
        `;
      }
      return guides(tx);
    });
    expect(kept.length).toBe(50);
  });

  test("erasure keeps no version, and does not keep the last guide either", async () => {
    const kept = await asService(async (tx) => {
      await tx`update public.profiles set voice_guide_md = 'a' where id = ${SEED.trustedMember}`;
      await tx`update public.profiles set voice_guide_md = 'b' where id = ${SEED.trustedMember}`;
      await tx`select public.erase_account(${SEED.trustedMember})`;
      return guides(tx);
    });
    expect(kept).toEqual([]);
  });
});

// Issue #43: rate-limit counters go once no window can count them.
describe("sweep_rate_limits (#43)", () => {
  test("removes rows older than two days and keeps the rest", async () => {
    const left = await asService(async (tx) => {
      await tx`
        insert into public.rate_limits (subject, action, window_start, count) values
          ('test:old', 'probe', now() - interval '49 hours', 1),
          ('test:day', 'probe', now() - interval '47 hours', 1),
          ('test:now', 'probe', date_trunc('hour', now()), 1)
      `;
      const [{ removed } = { removed: -1 }] = await tx<{ removed: number }[]>`
        select public.sweep_rate_limits() as removed
      `;
      const rows = await tx<{ subject: string }[]>`
        select subject from public.rate_limits where subject like 'test:%' order by subject
      `;
      return { removed, subjects: rows.map((row) => row.subject) };
    });
    expect(left.removed).toBeGreaterThanOrEqual(1);
    expect(left.subjects).toEqual(["test:day", "test:now"]);
  });

  test("is scheduled hourly, and browser roles cannot run it", async () => {
    const [job] = await sql<{ schedule: string; command: string }[]>`
      select schedule, command from cron.job where jobname = 'sweep-rate-limits'
    `;
    expect(job).toEqual({
      schedule: "23 * * * *",
      command: "select public.sweep_rate_limits()",
    });
    for (const role of ["anon", "authenticated"] as const) {
      const code = await errorCodeOf(() =>
        asRole(sql, role, (tx) => tx`select public.sweep_rate_limits()`),
      );
      expect({ role, code }).toEqual({ role, code: INSUFFICIENT_PRIVILEGE });
    }
  });
});

// Issue #25: an invite link is spent one use at a time, and a revoked, expired or used
// up link grants nothing.
describe("redeem_invite (#25)", () => {
  const redeem = (tx: TransactionSql, hash: string) =>
    tx<{ trust: string | null }[]>`select public.redeem_invite(${hash}) as trust`.then(
      (rows) => rows[0]?.trust ?? null,
    );

  test("a two-use link grants its level twice, then nothing", async () => {
    const answers = await asService(async (tx) => {
      await tx`
        insert into public.invites (token_hash, created_by, max_uses, trust_level)
        values ('h-two', ${SEED.admin}, 2, 'probation')
      `;
      return [
        await redeem(tx, "h-two"),
        await redeem(tx, "h-two"),
        await redeem(tx, "h-two"),
      ];
    });
    expect(answers).toEqual(["probation", "probation", null]);
  });

  test("a revoked, an expired and an unknown link grant nothing", async () => {
    const answers = await asService(async (tx) => {
      await tx`
        insert into public.invites (token_hash, created_by, revoked_at, expires_at) values
          ('h-revoked', ${SEED.admin}, now(), null),
          ('h-expired', ${SEED.admin}, null, now() - interval '1 minute')
      `;
      return [
        await redeem(tx, "h-revoked"),
        await redeem(tx, "h-expired"),
        await redeem(tx, "h-unknown"),
      ];
    });
    expect(answers).toEqual([null, null, null]);
  });

  test("a released use can be spent again, and a release never goes below zero", async () => {
    const answers = await asService(async (tx) => {
      await tx`
        insert into public.invites (token_hash, created_by, max_uses)
        values ('h-release', ${SEED.admin}, 1)
      `;
      const first = await redeem(tx, "h-release");
      await tx`select public.release_invite('h-release')`;
      await tx`select public.release_invite('h-release')`;
      const [row] = await tx<{ used_count: number }[]>`
        select used_count from public.invites where token_hash = 'h-release'
      `;
      return [first, row?.used_count, await redeem(tx, "h-release")];
    });
    expect(answers).toEqual(["trusted", 0, "trusted"]);
  });

  test("a link with no limit defaults to trusted", async () => {
    const trust = await asService(async (tx) => {
      await tx`insert into public.invites (token_hash, created_by) values ('h-open', ${SEED.admin})`;
      return redeem(tx, "h-open");
    });
    expect(trust).toBe("trusted");
  });
});

describe("media post link (#80)", () => {
  // A fresh upload of the trusted member's, with no post yet.
  const upload = async (tx: TransactionSql, id: string) => {
    await tx`
      insert into public.media_assets
        (id, owner_id, storage_path, kind, mime_type, original_filename, bytes, sha256)
      values (${id}, ${SEED.trustedMember}, ${`members/${id}.png`}, 'image', 'image/png',
        'porch.png', 10, ${"a".repeat(64)})
    `;
  };
  const postIdOf = async (tx: TransactionSql, id: string) => {
    const [row] = await tx<{ post_id: string | null }[]>`
      select post_id from public.media_assets where id = ${id}
    `;
    return row?.post_id ?? null;
  };
  const MEDIA = "00000000-0000-4000-8000-0000000000f1";
  const OTHER_POST = "00000000-0000-4000-8000-0000000000f2";

  test("a save that puts an upload in the body links it, and a later post does not take it", async () => {
    const [first, second] = await asService(async (tx) => {
      await upload(tx, MEDIA);
      await tx`
        update public.posts set body_md = ${`![porch](https://x.test/public-media/${MEDIA}.png)`}
        where id = ${SEED.draftPost}
      `;
      const linked = await postIdOf(tx, MEDIA);
      await tx`
        insert into public.posts (id, author_id, slug, title, body_md)
        values (${OTHER_POST}, ${SEED.trustedMember}, 'second-post', 'Second',
          ${`![again](https://x.test/public-media/${MEDIA}.png)`})
      `;
      return [linked, await postIdOf(tx, MEDIA)];
    });
    expect(first).toBe(SEED.draftPost);
    expect(second).toBe(SEED.draftPost);
  });

  test("a cover links its upload", async () => {
    const linked = await asService(async (tx) => {
      await upload(tx, MEDIA);
      await tx`update public.posts set cover_media_id = ${MEDIA} where id = ${SEED.draftPost}`;
      return postIdOf(tx, MEDIA);
    });
    expect(linked).toBe(SEED.draftPost);
  });

  test("another member's post never links an upload that is not theirs", async () => {
    const linked = await asService(async (tx) => {
      await upload(tx, MEDIA);
      await tx`
        update public.posts set body_md = ${`see ${MEDIA}`}
        where id = ${SEED.pendingPost}
      `;
      return postIdOf(tx, MEDIA);
    });
    expect(linked).toBeNull();
  });

  test("an upload taken out is unused, unless another post still uses it", async () => {
    const [takenOut, stillUsed] = await asService(async (tx) => {
      await upload(tx, MEDIA);
      await tx`update public.posts set body_md = ${`x ${MEDIA}`} where id = ${SEED.draftPost}`;
      await tx`update public.posts set body_md = 'nothing now' where id = ${SEED.draftPost}`;
      const unused = await tx<{ id: string }[]>`
        select public.unused_media(array[${MEDIA}]::uuid[], ${SEED.trustedMember}, ${SEED.draftPost}) as id
      `;
      await tx`
        insert into public.posts (id, author_id, slug, title, body_md)
        values (${OTHER_POST}, ${SEED.trustedMember}, 'second-post', 'Second', ${`y ${MEDIA}`})
      `;
      const afterReuse = await tx<{ id: string }[]>`
        select public.unused_media(array[${MEDIA}]::uuid[], ${SEED.trustedMember}, ${SEED.draftPost}) as id
      `;
      return [unused.map((r) => r.id), afterReuse.map((r) => r.id)];
    });
    expect(takenOut).toContain(MEDIA);
    expect(stillUsed).not.toContain(MEDIA);
  });

  test("an upload another member's post shows is not unused", async () => {
    const unused = await asService(async (tx) => {
      await upload(tx, MEDIA);
      await tx`update public.posts set body_md = ${`x ${MEDIA}`} where id = ${SEED.draftPost}`;
      await tx`update public.posts set body_md = 'nothing now' where id = ${SEED.draftPost}`;
      await tx`update public.posts set body_md = ${`borrowed ${MEDIA}`} where id = ${SEED.pendingPost}`;
      return tx<{ id: string }[]>`
        select public.unused_media(array[${MEDIA}]::uuid[], ${SEED.trustedMember}, ${SEED.draftPost}) as id
      `;
    });
    expect(unused.map((r) => r.id)).not.toContain(MEDIA);
  });

  test("an upload attached to its post for later is marked used once a save puts it in", async () => {
    const [attached, inserted] = await asService(async (tx) => {
      await upload(tx, MEDIA);
      await tx`update public.media_assets set post_id = ${SEED.draftPost} where id = ${MEDIA}`;
      const [before] = await tx<{ used_in_post: boolean }[]>`
        select used_in_post from public.media_assets where id = ${MEDIA}
      `;
      await tx`update public.posts set body_md = ${`x ${MEDIA}`} where id = ${SEED.draftPost}`;
      const [after] = await tx<{ used_in_post: boolean }[]>`
        select used_in_post from public.media_assets where id = ${MEDIA}
      `;
      return [before?.used_in_post, after?.used_in_post];
    });
    expect(attached).toBe(false);
    expect(inserted).toBe(true);
  });

  test("an upload cannot belong to another member's post", async () => {
    const code = await errorCodeOf(() =>
      asService(async (tx) => {
        await upload(tx, MEDIA);
        await tx`update public.media_assets set post_id = ${SEED.pendingPost} where id = ${MEDIA}`;
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  test("browser roles cannot run the link functions", async () => {
    const link = await errorCodeOf(() =>
      asRole(
        sql,
        "authenticated",
        (tx) => tx`select public.link_post_media(${SEED.draftPost})`,
      ),
    );
    const unused = await errorCodeOf(() =>
      asRole(
        sql,
        "authenticated",
        (tx) =>
          tx`select public.unused_media(array[${SEED.publishedMedia}]::uuid[], ${SEED.trustedMember})`,
      ),
    );
    expect(link).toBe(INSUFFICIENT_PRIVILEGE);
    expect(unused).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("agent_tokens OAuth grants (#79, D25)", () => {
  const CLIENT = "6e1a791f-75b8-46fb-a738-7c53cb270412";
  const HASH = "a".repeat(64);

  test("a row is a personal token or an OAuth grant, never both and never neither", async () => {
    const both = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.agent_tokens (owner_id, name, scopes, token_hash, oauth_client_id)
          values (${SEED.trustedMember}, 'both', '{posts:draft}', ${HASH}, ${CLIENT})
        `,
      ),
    );
    const neither = await errorCodeOf(() =>
      asService(
        (tx) => tx`
          insert into public.agent_tokens (owner_id, name, scopes)
          values (${SEED.trustedMember}, 'neither', '{posts:draft}')
        `,
      ),
    );
    expect(both).toBe(CHECK_VIOLATION);
    expect(neither).toBe(CHECK_VIOLATION);
  });

  test("one live grant per member and client, and a revoked one does not count", async () => {
    const grant = (tx: TransactionSql, revoked: boolean) => tx`
      insert into public.agent_tokens (owner_id, name, scopes, oauth_client_id, revoked_at)
      values (${SEED.trustedMember}, 'Claude', '{posts:draft}', ${CLIENT},
        ${revoked ? new Date() : null})
    `;
    const twoLive = await errorCodeOf(() =>
      asService(async (tx) => {
        await grant(tx, false);
        await grant(tx, false);
      }),
    );
    const afterRevoked = await errorCodeOf(() =>
      asService(async (tx) => {
        await grant(tx, true);
        await grant(tx, false);
      }),
    );
    expect(twoLive).toBe(UNIQUE_VIOLATION);
    expect(afterRevoked).toBeNull();
  });
});

// Issue #87 (D13, D20): one call claims a post's announcement and writes its follower
// notices. The seed's posts have no announcement yet on a fresh reset, but a stack
// that ran the #87 backfill after seeding has them marked, so each test clears the
// mark first. Each test also clears the follows it depends on, so rows other test runs
// left behind do not change the counts.
const MAKING_TAG = "00000000-0000-4000-8000-0000000000e3";
const ANNOUNCE_AT = new Date("2026-09-28T12:00:00.000Z");

class RollbackAnnounce extends Error {}

describe("announce_post (#87)", () => {
  const announce = (tx: TransactionSql, postId: string) =>
    tx<{ notified: number }[]>`
      select public.announce_post(${postId}, ${ANNOUNCE_AT}) as notified
    `.then((rows) => rows[0]?.notified);
  const noticesFor = (tx: TransactionSql, postId: string) =>
    tx<{ recipient_id: string }[]>`
      select recipient_id from public.notifications
      where post_id = ${postId} and kind = 'post.published'
      order by recipient_id
    `.then((rows) => rows.map((row) => row.recipient_id));
  const reset = (tx: TransactionSql, postIds: readonly string[]) => tx`
    update public.posts set announced_at = null where id = any(${sql.array([...postIds])}::uuid[])
  `;

  test("tells author and tag followers once each, minus the author, muters and blockers", async () => {
    const result = await asService(async (tx) => {
      await reset(tx, [SEED.publicPost]);
      await tx`
        delete from public.follows
        where author_id = ${SEED.trustedMember} or tag_id = ${MAKING_TAG}
      `;
      await tx`
        insert into public.follows (follower_id, author_id, tag_id) values
          (${SEED.moderator}, ${SEED.trustedMember}, null),
          (${SEED.moderator}, null, ${MAKING_TAG}),
          (${SEED.admin}, null, ${MAKING_TAG}),
          (${SEED.trustedMember}, null, ${MAKING_TAG}),
          (${SEED.probationMember}, ${SEED.trustedMember}, null),
          (${SEED.erasedMember}, null, ${MAKING_TAG})
      `;
      await tx`
        insert into public.member_blocks (member_id, target_id, level) values
          (${SEED.probationMember}, ${SEED.trustedMember}, 'mute'),
          (${SEED.erasedMember}, ${SEED.trustedMember}, 'block')
      `;
      const first = await announce(tx, SEED.publicPost);
      const recipients = await noticesFor(tx, SEED.publicPost);
      const [{ announced_at, db_now } = { announced_at: null, db_now: null }] = await tx<
        { announced_at: Date | null; db_now: Date }[]
      >`select announced_at, now() as db_now from public.posts where id = ${SEED.publicPost}`;
      const second = await announce(tx, SEED.publicPost);
      const after = await noticesFor(tx, SEED.publicPost);
      return { first, recipients, announced_at, db_now, second, after };
    });
    expect(result.first).toBe(2);
    expect(result.recipients).toEqual([SEED.admin, SEED.moderator].sort());
    // The database clock, not the time the app passed in (#86).
    expect(result.announced_at).toEqual(result.db_now);
    expect(result.announced_at).not.toEqual(ANNOUNCE_AT);
    expect(result.second).toBe(0);
    expect(result.after).toEqual(result.recipients);
  });

  test("the database clock sets the mark once, and a set mark can change (#86)", async () => {
    const result = await asService(async (tx) => {
      await reset(tx, [SEED.publicPost]);
      await tx`
        update public.posts set announced_at = now() - interval '1 hour'
        where id = ${SEED.publicPost}
      `;
      const [first] = await tx<{ same: boolean }[]>`
        select announced_at = now() as same from public.posts where id = ${SEED.publicPost}
      `;
      await tx`
        update public.posts set announced_at = now() - interval '1 hour'
        where id = ${SEED.publicPost}
      `;
      const [later] = await tx<{ back: boolean }[]>`
        select announced_at = now() - interval '1 hour' as back
        from public.posts where id = ${SEED.publicPost}
      `;
      return [first?.same, later?.back];
    });
    expect(result).toEqual([true, true]);
  });

  test("announces no draft, unlisted or pending post", async () => {
    const posts = [SEED.draftPost, SEED.unlistedPost, SEED.pendingPost];
    const result = await asService(async (tx) => {
      await reset(tx, posts);
      await tx`
        insert into public.follows (follower_id, author_id) values
          (${SEED.admin}, ${SEED.trustedMember}),
          (${SEED.admin}, ${SEED.probationMember})
        on conflict do nothing
      `;
      const answers = [];
      for (const post of posts) {
        answers.push(await announce(tx, post));
        answers.push((await noticesFor(tx, post)).length);
      }
      const marked = await tx`
        select 1 from public.posts
        where id = any(${sql.array(posts)}::uuid[]) and announced_at is not null
      `;
      return { answers, marked: marked.length };
    });
    expect(result.answers).toEqual([0, 0, 0, 0, 0, 0]);
    expect(result.marked).toBe(0);
  });

  test("an anonymous post reaches its tags' followers", async () => {
    const recipients = await asService(async (tx) => {
      await tx`
        update public.posts set status = 'published', published_at = now(), announced_at = null
        where id = ${SEED.anonymousPendingPost}
      `;
      await tx`
        insert into public.post_tags (post_id, tag_id)
        values (${SEED.anonymousPendingPost}, ${MAKING_TAG})
      `;
      await tx`delete from public.follows where tag_id = ${MAKING_TAG}`;
      await tx`
        insert into public.follows (follower_id, tag_id) values (${SEED.admin}, ${MAKING_TAG})
      `;
      await announce(tx, SEED.anonymousPendingPost);
      return noticesFor(tx, SEED.anonymousPendingPost);
    });
    expect(recipients).toEqual([SEED.admin]);
  });

  // A trigger that refuses the notice insert stands in for any failure there. It is
  // made as `postgres` (the service role cannot own a trigger) inside a transaction
  // that always rolls back.
  test("a failed notice insert leaves the post unclaimed", async () => {
    let seen: { code: string | null; announcedAt: Date | null } | undefined;
    try {
      await sql.begin(async (tx) => {
        await tx`update public.posts set announced_at = null where id = ${SEED.publicPost}`;
        await tx`
          insert into public.follows (follower_id, author_id)
          values (${SEED.admin}, ${SEED.trustedMember})
          on conflict do nothing
        `;
        await tx.unsafe(`
          create function pg_temp.refuse_notice() returns trigger language plpgsql as $$
          begin raise exception 'no notices today'; end; $$;
          create trigger refuse_notice before insert on public.notifications
            for each row execute function pg_temp.refuse_notice();
        `);
        await tx.unsafe("set local role service_role");
        const code = await errorCodeOf(() =>
          tx.savepoint(
            (sp) => sp`select public.announce_post(${SEED.publicPost}, now())`,
          ),
        );
        const [row] = await tx<{ announced_at: Date | null }[]>`
          select announced_at from public.posts where id = ${SEED.publicPost}
        `;
        seen = { code, announcedAt: row?.announced_at ?? null };
        throw new RollbackAnnounce();
      });
    } catch (error: unknown) {
      if (!(error instanceof RollbackAnnounce)) throw error;
    }
    expect(seen).toEqual({ code: "P0001", announcedAt: null });
  });
});
