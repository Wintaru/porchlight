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
