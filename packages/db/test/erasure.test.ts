import type { Sql, TransactionSql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  asRole,
  connect,
  errorCodeOf,
  INSUFFICIENT_PRIVILEGE,
  SEED,
} from "./local-stack";

// Issue #83 (SPEC.md §10, D5, D6): erasure leaves nothing of the member behind. Every
// foreign key to `profiles`, or to `auth.users` from outside the auth schema, must be
// named below. A new one fails the first test until someone decides what erasure does
// with it and, for "delete" or "null", writes that into `erase_account`.

type Handling =
  // erase_account deletes the member's rows.
  | { readonly kind: "delete"; readonly remains?: string }
  // erase_account sets the column to null.
  | { readonly kind: "null"; readonly remains?: string }
  // Kept on purpose: accountability records that hold only an erased profile's id.
  | { readonly kind: "keep" };

// `remains` is a condition on the row (alias `t`) under which erasure leaves it: frozen
// evidence outlives an erasure (§10).
const RETAINED = "t.retain_until > now()";

const HANDLED: Readonly<Record<string, Handling>> = {
  "public.agent_tokens.owner_id": { kind: "delete" },
  "public.anonymous_authors.claimed_by": {
    kind: "null",
    remains:
      "exists (select 1 from public.submission_evidence e where e.anonymous_author_id = t.id and e.retain_until > now())",
  },
  "public.audit_log.actor_id": { kind: "keep" },
  "public.blocks.created_by": { kind: "keep" },
  "public.comments.author_id": { kind: "delete" },
  "public.email_preferences.profile_id": { kind: "delete" },
  "public.follows.author_id": { kind: "delete" },
  "public.follows.follower_id": { kind: "delete" },
  "public.invites.created_by": { kind: "keep" },
  "public.media_assets.owner_id": { kind: "delete", remains: RETAINED },
  "public.member_blocks.member_id": { kind: "delete" },
  "public.member_blocks.target_id": { kind: "delete" },
  "public.mod_actions.actor_id": { kind: "keep" },
  "public.mod_actions.target_profile_id": { kind: "keep" },
  "public.notifications.recipient_id": { kind: "delete" },
  "public.posts.author_id": { kind: "delete" },
  "public.quotas.profile_id": { kind: "delete" },
  "public.reactions.profile_id": { kind: "delete" },
  "public.reports.reporter_id": { kind: "keep" },
  "public.reports.resolved_by": { kind: "keep" },
  "public.site_config.updated_by": { kind: "keep" },
  "public.submission_evidence.author_id": { kind: "delete", remains: RETAINED },
  "public.subscribers.author_id": { kind: "delete" },
  "public.voice_guide_revisions.profile_id": { kind: "delete" },
};

interface ForeignKey {
  readonly schema: string;
  readonly table: string;
  readonly column: string;
  readonly target: string;
  readonly onDelete: string;
}

const keyOf = (fk: ForeignKey) => `${fk.schema}.${fk.table}.${fk.column}`;

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

let sql: Sql;
let foreignKeys: readonly ForeignKey[];
let eraseBody: string;

beforeAll(async () => {
  sql = connect();
  foreignKeys = await sql<ForeignKey[]>`
    select n.nspname as schema, t.relname as "table", a.attname as column,
           c.confrelid::regclass::text as target, c.confdeltype as "onDelete"
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join unnest(c.conkey) as k (attnum) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f'
      and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
    order by 1, 2, 3
  `;
  const [row] = await sql<{ body: string }[]>`
    select prosrc as body from pg_proc
    where oid = 'public.erase_account(uuid)'::regprocedure
  `;
  if (row === undefined) throw new Error("erase_account is missing");
  // Comments dropped, so a commented-out statement does not count as handled.
  eraseBody = row.body.replace(/--.*$/gm, "");
});

afterAll(async () => {
  await sql.end();
});

const memberKeys = () => foreignKeys.filter((fk) => fk.schema !== "auth");

describe("erase_account covers every table that points at a member (#83)", () => {
  test("every foreign key to profiles or auth.users is named, and no name is stale", () => {
    expect(memberKeys().map(keyOf).sort()).toEqual(Object.keys(HANDLED).sort());
    expect(memberKeys().length).toBeGreaterThan(20);
  });

  // The auth user is deleted last (SupabaseEraseProfileHandler), and GoTrue's own
  // tables go with it only if their keys cascade or clear.
  test("auth's own tables go with the auth user", () => {
    const authKeys = foreignKeys.filter((fk) => fk.schema === "auth");
    expect(authKeys.length).toBeGreaterThan(0);
    for (const fk of authKeys) {
      expect({ key: keyOf(fk), onDelete: fk.onDelete }).toEqual({
        key: keyOf(fk),
        onDelete: expect.stringMatching(/^[cn]$/) as unknown,
      });
    }
  });

  test("erase_account writes a delete or a null for each key that needs one", () => {
    for (const fk of memberKeys()) {
      const handling = HANDLED[keyOf(fk)];
      if (handling === undefined || handling.kind === "keep") continue;
      const table = `public\\.${fk.table}\\b`;
      const matches = `\\b${fk.column}\\s*=\\s*p_profile_id`;
      const pattern =
        handling.kind === "delete"
          ? new RegExp(`delete from ${table}[^;]*${matches}`)
          : new RegExp(
              `update ${table}[^;]*\\bset\\b[^;]*\\b${fk.column}\\s*=\\s*null[^;]*${matches}`,
            );
      expect({ key: keyOf(fk), handled: pattern.test(eraseBody) }).toEqual({
        key: keyOf(fk),
        handled: true,
      });
    }
  });

  // Every delete/null key gets a fixture first, so a count of zero afterwards means
  // erasure removed something, not that there was nothing to remove.
  test("after an erasure no row that needs to go still points at the member", async () => {
    const member = SEED.trustedMember;
    const [before, after] = await asRole(sql, "service_role", async (tx) => {
      await arrangeEverything(tx, member);
      const before = await countPointingAt(tx, member);
      await tx`select public.erase_account(${member})`;
      return [before, await countPointingAt(tx, member)];
    });
    for (const [key, count] of Object.entries(before)) {
      expect({ key, arranged: count > 0 }).toEqual({ key, arranged: true });
    }
    for (const [key, count] of Object.entries(after)) {
      expect({ key, count }).toEqual({ key, count: 0 });
    }
  });

  test("the member's own reader subscriptions go, found by their address", async () => {
    const left = await asRole(sql, "service_role", async (tx) => {
      await arrangeEverything(tx, SEED.trustedMember);
      await tx`select public.erase_account(${SEED.trustedMember})`;
      return tx<{ email: string }[]>`
        select email from public.subscribers
        where email in ('theo@porchlight.local', 'someone-else@example.test')
        order by email
      `;
    });
    expect(left.map((row) => row.email)).toEqual(["someone-else@example.test"]);
  });

  test("a claimed anonymous author with frozen evidence keeps its claim", async () => {
    const claim = await asRole(sql, "service_role", async (tx) => {
      await tx`
        update public.anonymous_authors
        set claimed_by = ${SEED.trustedMember}, claimed_at = now()
        where id = ${SEED.anonymousAuthor}
      `;
      await tx`
        insert into public.submission_evidence (
          subject_kind, subject_id, anonymous_author_id, raw_ip_expires_at, ip_hash,
          turnstile_result, request_id, frozen, retain_until
        ) values (
          'post', ${SEED.anonymousPendingPost}, ${SEED.anonymousAuthor}, now(), 'hash',
          'not_required', 'erasure-frozen', true, now() + interval '1 year'
        )
      `;
      await tx`select public.erase_account(${SEED.trustedMember})`;
      return tx<{ claimed_by: string | null }[]>`
        select claimed_by from public.anonymous_authors where id = ${SEED.anonymousAuthor}
      `;
    });
    expect(claim).toEqual([{ claimed_by: SEED.trustedMember }]);
  });

  test("the address lookup is closed to browser roles", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      const code = await errorCodeOf(() =>
        asRole(
          sql,
          role,
          (tx) => tx`select public.member_email_of(${SEED.trustedMember})`,
        ),
      );
      expect({ role, code }).toEqual({ role, code: INSUFFICIENT_PRIVILEGE });
    }
  });
});

// Rows per delete/null key that erasure must remove, keyed like HANDLED. Retained rows
// (`remains`) are not counted.
async function countPointingAt(
  tx: TransactionSql,
  member: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const fk of memberKeys()) {
    const handling = HANDLED[keyOf(fk)];
    if (handling === undefined || handling.kind === "keep") continue;
    const remains = handling.remains ?? "false";
    const [row] = await tx.unsafe<{ n: number }[]>(
      `select count(*)::int as n from ${quote(fk.schema)}.${quote(fk.table)} t
       where t.${quote(fk.column)} = $1 and not coalesce(${remains}, false)`,
      [member],
    );
    counts[keyOf(fk)] = row?.n ?? -1;
  }
  return counts;
}

// At least one row for every delete/null key, on top of what the seed gives the member
// (posts, comments, reactions, evidence), and reader subscriptions under the
// member's address next to a stranger's.
async function arrangeEverything(tx: TransactionSql, member: string): Promise<void> {
  const other = SEED.moderator;
  await tx`
    insert into public.agent_tokens (owner_id, name, token_hash, scopes)
    values (${member}, 'erasure', repeat('a', 64), '{posts:draft}')
  `;
  await tx`select public.set_email_preferences(${member}, 'daily', false)`;
  await tx`
    insert into public.media_assets (
      owner_id, storage_path, kind, mime_type, original_filename, bytes, sha256
    ) values (
      ${member}, 'erasure/fixture.jpg', 'image', 'image/jpeg', 'fixture.jpg', 1,
      repeat('b', 64)
    )
  `;
  await tx`
    insert into public.follows (follower_id, author_id)
    values (${member}, ${other}), (${other}, ${member})
  `;
  await tx`
    insert into public.member_blocks (member_id, target_id, level)
    values (${member}, ${other}, 'mute'), (${other}, ${member}, 'mute')
  `;
  for (const text of ["first guide", "second guide"]) {
    await tx`update public.profiles set voice_guide_md = ${text} where id = ${member}`;
  }
  await tx`
    insert into public.notifications (recipient_id, kind, payload)
    values (${member}, 'reply.created', '{}')
  `;
  await tx`
    insert into public.quotas (profile_id) values (${member})
    on conflict (profile_id) do nothing
  `;
  await tx`
    update public.anonymous_authors
    set claimed_by = ${member}, claimed_at = now()
    where id = ${SEED.anonymousAuthor}
  `;
  for (const [email, token, author] of [
    ["theo@porchlight.local", "erase-1", null],
    ["theo@porchlight.local", "erase-2", SEED.moderator],
    ["someone-else@example.test", "erase-3", null],
    ["someone-else@example.test", "erase-4", member],
  ] as const) {
    await tx`select public.request_subscription(${email}, 'daily', ${token}, ${author})`;
  }
}
