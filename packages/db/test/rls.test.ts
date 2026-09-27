import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  asRole,
  connect,
  errorCodeOf,
  INSUFFICIENT_PRIVILEGE,
  SEED,
  type DbRole,
} from "./local-stack";

// The read wall (SPEC.md §3, D2): what the browser roles can and cannot see. Every
// policy in supabase/migrations/*_rls.sql has a test here, and the first block guards
// every table, including ones a later migration adds.

let sql: Sql;

beforeAll(() => {
  sql = connect();
});

afterAll(async () => {
  await sql.end();
});

const BROWSER_ROLES: readonly DbRole[] = ["anon", "authenticated"];

// The phase 1 tables SPEC.md §11 names. The migrations must create every one.
const PHASE_1_TABLES = [
  "profiles",
  "anonymous_authors",
  "posts",
  "comments",
  "tags",
  "post_tags",
  "reactions",
  "media_assets",
  "submission_evidence",
  "reports",
  "mod_actions",
  "audit_log",
  "notifications",
  "quotas",
  "rate_limits",
  "blocks",
  "site_config",
  "agent_tokens",
] as const;

// The tables phase 2 adds. Each is listed on purpose: a new one lands here and, unless
// it joins BROWSER_READABLE_TABLES below, the closed-by-default test covers it.
const PHASE_2_TABLES = [
  "member_blocks",
  "post_revisions",
  "follows",
  // #22: email settings and digest cursors, server only.
  "email_preferences",
  // #22, D20: readers who follow the site or an author by email, server only.
  "subscribers",
  // #32: earlier versions of a member's voice guide, server only.
  "voice_guide_revisions",
  // #25: invite links, server only.
  "invites",
] as const;

// Server-only functions: the service role calls them, a browser role never may (#22).
const SERVER_ONLY_FUNCTIONS = [
  "public.set_email_preferences(uuid, public.digest_schedule, boolean)",
  "public.claim_member_emails(timestamptz, integer)",
  "public.release_member_email(uuid, text, timestamptz, timestamptz)",
  "public.request_subscription(text, public.digest_schedule, text, uuid)",
  "public.confirm_subscription(text)",
  "public.claim_subscriber_emails(timestamptz, integer)",
  "public.release_subscriber_email(uuid, timestamptz, timestamptz)",
  "public.redeem_invite(text)",
] as const;

// The only tables a browser role may read at all. Every other table in `public`, now or
// later, must refuse a select, so a new table is closed by default and tested as such.
const BROWSER_READABLE_TABLES: ReadonlySet<string> = new Set([
  "profiles",
  "posts",
  "comments",
  "tags",
  "post_tags",
  "reactions",
  "media_assets",
  "notifications",
  // #23: a member reads their own mutes and blocks, to filter their own lists.
  "member_blocks",
  // #24: a member reads their own follows, for the Following feed and the buttons.
  "follows",
]);

async function publicTables(): Promise<string[]> {
  const rows = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  return rows.map((row) => row.table_name);
}

describe("every table", () => {
  test("from SPEC.md §11 exists", async () => {
    const tables = await publicTables();
    expect(tables).toEqual(expect.arrayContaining([...PHASE_1_TABLES]));
  });

  test("from phase 2 exists", async () => {
    const tables = await publicTables();
    expect(tables).toEqual(expect.arrayContaining([...PHASE_2_TABLES]));
  });

  test("server-only functions refuse the browser roles", async () => {
    const rows = await sql<{ fn: string; role: string; allowed: boolean }[]>`
      select f.fn, r.role, has_function_privilege(r.role, f.fn, 'execute') as allowed
      from unnest(${sql.array([...SERVER_ONLY_FUNCTIONS])}::text[]) as f(fn)
      cross join unnest(${sql.array([...BROWSER_ROLES, "service_role"])}::text[]) as r(role)
      order by 1, 2
    `;
    expect(rows.filter((row) => row.allowed !== (row.role === "service_role"))).toEqual(
      [],
    );
  });

  test("has row level security on", async () => {
    const off = await sql<{ relname: string }[]>`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      order by c.relname
    `;
    expect(off.map((row) => row.relname)).toEqual([]);
  });

  test("refuses every write privilege to the browser roles, on any column", async () => {
    // has_any_column_privilege is true when the role holds the privilege on the whole
    // table or on any one column, so a column-level `grant update (read_at)` shows up too.
    const leaks = await sql<{ table_name: string; role: string; privilege: string }[]>`
      select t.table_name, r.role, p.privilege
      from information_schema.tables t
      cross join unnest(${sql.array([...BROWSER_ROLES])}::text[]) as r(role)
      cross join unnest(array['insert', 'update', 'delete', 'truncate']) as p(privilege)
      where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
        and (
          has_table_privilege(r.role, 'public.' || t.table_name, p.privilege)
          or (p.privilege in ('insert', 'update')
              and has_any_column_privilege(r.role, 'public.' || t.table_name, p.privilege))
        )
      order by 1, 2, 3
    `;
    expect(leaks).toEqual([]);
  });

  test("outside the readable set is closed to the browser roles", async () => {
    const closed = (await publicTables()).filter(
      (table) => !BROWSER_READABLE_TABLES.has(table),
    );
    expect(closed.length).toBeGreaterThanOrEqual(9);
    for (const table of closed) {
      for (const role of BROWSER_ROLES) {
        const code = await errorCodeOf(() =>
          asRole(
            sql,
            role,
            (tx) => tx.unsafe(`select 1 from public.${table} limit 1`),
            SEED.admin,
          ),
        );
        expect({ table, role, code }).toEqual({
          table,
          role,
          code: INSUFFICIENT_PRIVILEGE,
        });
      }
    }
  });
});

// Issue #27's own line: the generic test above already closes every unlisted table,
// but the token table is the one a leak would turn into a stolen session, so it is
// named here as well, for the owner's own row and for the service-role path.
describe("agent_tokens", () => {
  test("is closed to the browser roles, even for the token's owner", async () => {
    for (const role of BROWSER_ROLES) {
      const code = await errorCodeOf(() =>
        asRole(
          sql,
          role,
          (tx) =>
            tx`select id from public.agent_tokens where owner_id = ${SEED.trustedMember}`,
          SEED.trustedMember,
        ),
      );
      expect({ role, code }).toEqual({ role, code: INSUFFICIENT_PRIVILEGE });
    }
  });

  test("the service role reads and writes it", async () => {
    const rows = await asRole(sql, "service_role", async (tx) => {
      await tx`
        insert into public.agent_tokens (owner_id, name, token_hash, scopes)
        values (${SEED.trustedMember}, 'laptop', ${"a".repeat(64)}, '{posts:draft}')
      `;
      return tx`select name from public.agent_tokens where token_hash = ${"a".repeat(64)}`;
    });
    expect(rows).toEqual([{ name: "laptop" }]);
  });
});

// Issue #23: a member's mutes and blocks are private. The member reads their own rows
// so the read-model can filter their lists; nobody reads who muted or blocked them,
// a visitor reads nothing, and every write goes through the AccountManager.
describe("member_blocks", () => {
  test("a member reads only their own rows, a visitor none, and nobody writes", async () => {
    await sql`
      insert into public.member_blocks (member_id, target_id, level) values
        (${SEED.trustedMember}, ${SEED.probationMember}, 'mute'),
        (${SEED.probationMember}, ${SEED.trustedMember}, 'block')
    `;
    try {
      const theo = await asRole(
        sql,
        "authenticated",
        (tx) =>
          tx<
            { member_id: string; target_id: string; level: string }[]
          >`select member_id, target_id, level from public.member_blocks`,
        SEED.trustedMember,
      );
      expect(theo).toEqual([
        {
          member_id: SEED.trustedMember,
          target_id: SEED.probationMember,
          level: "mute",
        },
      ]);

      const anonCode = await errorCodeOf(() =>
        asRole(sql, "anon", (tx) => tx`select 1 from public.member_blocks limit 1`),
      );
      expect(anonCode).toBe(INSUFFICIENT_PRIVILEGE);

      const writeCode = await errorCodeOf(() =>
        asRole(
          sql,
          "authenticated",
          (tx) => tx`
            insert into public.member_blocks (member_id, target_id, level)
            values (${SEED.trustedMember}, ${SEED.admin}, 'block')
          `,
          SEED.trustedMember,
        ),
      );
      expect(writeCode).toBe(INSUFFICIENT_PRIVILEGE);
    } finally {
      await sql`
        delete from public.member_blocks
        where member_id in (${SEED.trustedMember}, ${SEED.probationMember})
      `;
    }
  });
});

// Issue #23: search runs as the caller (SECURITY INVOKER), then keeps to public
// published posts and visible comments. Each word below is only in a post or comment a
// search must never return: unlisted, a draft (Theo's own, which RLS lets him read), a
// pending post, an anonymous pending post, and a pending comment.
describe("search_site", () => {
  test("finds only public published posts and visible comments", async () => {
    const hiddenOnly = ["unlisted", "thought", "hike", "account", "sometime"];
    for (const role of BROWSER_ROLES) {
      for (const word of hiddenOnly) {
        const rows = await asRole(
          sql,
          role,
          (tx) => tx<{ post_id: string }[]>`
            select post_id from public.search_site(${word}, 200)`,
          SEED.trustedMember,
        );
        expect({ role, word, rows }).toEqual({ role, word, rows: [] });
      }
    }
    const found = await asRole(
      sql,
      "anon",
      (tx) =>
        tx<{ post_id: string }[]>`select post_id from public.search_site('porch', 200)`,
    );
    expect(found.map((row) => row.post_id)).toContain(SEED.publicPost);
  });
});

// Issue #24: the Following feed runs as the caller and keeps to public published posts
// by a followed author or under a followed tag. A visitor cannot call it.
describe("following_post_ids", () => {
  test("lists a followed author's public posts and nothing a visitor may call", async () => {
    await sql`
      insert into public.follows (follower_id, author_id)
      values (${SEED.probationMember}, ${SEED.trustedMember})
    `;
    try {
      const rows = await asRole(
        sql,
        "authenticated",
        (tx) => tx<{ id: string }[]>`select id from public.following_post_ids(50)`,
        SEED.probationMember,
      );
      const ids = rows.map((row) => row.id);
      expect(ids).toContain(SEED.publicPost);
      for (const hidden of [SEED.unlistedPost, SEED.draftPost]) {
        expect(ids).not.toContain(hidden);
      }
      const nobody = await asRole(
        sql,
        "authenticated",
        (tx) => tx<{ id: string }[]>`select id from public.following_post_ids(50)`,
        SEED.moderator,
      );
      expect(nobody).toEqual([]);
      const anonCode = await errorCodeOf(() =>
        asRole(sql, "anon", (tx) => tx`select id from public.following_post_ids(50)`),
      );
      expect(anonCode).toBe(INSUFFICIENT_PRIVILEGE);
    } finally {
      await sql`delete from public.follows where follower_id = ${SEED.probationMember}`;
    }
  });
});

// Issue #24: follows are private to the follower, like mutes and blocks. Nobody reads
// who follows them (no follower counts, D9), a visitor reads nothing, and every write
// goes through the AccountManager.
describe("follows", () => {
  test("a member reads only their own follows, a visitor none, and nobody writes", async () => {
    await sql`
      insert into public.follows (follower_id, author_id) values
        (${SEED.probationMember}, ${SEED.trustedMember}),
        (${SEED.trustedMember}, ${SEED.probationMember})
    `;
    try {
      const june = await asRole(
        sql,
        "authenticated",
        (tx) =>
          tx<{ follower_id: string; author_id: string | null }[]>`
            select follower_id, author_id from public.follows`,
        SEED.probationMember,
      );
      expect(june).toEqual([
        { follower_id: SEED.probationMember, author_id: SEED.trustedMember },
      ]);

      const anonCode = await errorCodeOf(() =>
        asRole(sql, "anon", (tx) => tx`select 1 from public.follows limit 1`),
      );
      expect(anonCode).toBe(INSUFFICIENT_PRIVILEGE);

      const writeCode = await errorCodeOf(() =>
        asRole(
          sql,
          "authenticated",
          (tx) => tx`
            insert into public.follows (follower_id, author_id)
            values (${SEED.probationMember}, ${SEED.admin})`,
          SEED.probationMember,
        ),
      );
      expect(writeCode).toBe(INSUFFICIENT_PRIVILEGE);
    } finally {
      await sql`
        delete from public.follows
        where follower_id in (${SEED.trustedMember}, ${SEED.probationMember})
      `;
    }
  });
});

describe("anon", () => {
  test("reads published posts, unlisted included, and nothing else", async () => {
    // Unlisted is a listing rule the read-model applies, not a read wall: anyone with
    // the link may read the post (SPEC.md §5).
    const rows = await asRole(
      sql,
      "anon",
      (tx) => tx<{ slug: string }[]>`select slug from public.posts order by slug`,
    );
    expect(rows.map((row) => row.slug)).toEqual([
      "an-unlisted-note",
      "hello-from-the-porch",
      "welcome-to-porchlight",
    ]);
  });

  test("reads visible comments and tombstones, never pending ones", async () => {
    const rows = await asRole(
      sql,
      "anon",
      (tx) =>
        tx<{ status: string }[]>`
        select status from public.comments where post_id = ${SEED.publicPost} order by id
      `,
    );
    expect(rows.map((row) => row.status)).toEqual([
      "visible",
      "visible",
      "tombstone",
      "visible",
    ]);
  });

  test("reads active and erased profiles but not trust_level", async () => {
    // An erased row is only its handle and status (profiles_erased_is_blank), and is
    // what lets /@handle answer 410 instead of 404 (D11).
    const handles = await asRole(
      sql,
      "anon",
      (tx) =>
        tx<{ handle: string }[]>`select handle from public.profiles order by handle`,
    );
    expect(handles.map((row) => row.handle)).toEqual([
      "ivy",
      "june",
      "lamplighter",
      "mira",
      "theo",
      "wren",
    ]);

    const hidden = await asRole(sql, "anon", async (tx) => {
      await tx`set local role service_role`;
      await tx`update public.profiles set status = 'suspended' where id = ${SEED.trustedMember}`;
      await tx`set local role anon`;
      return tx<{ handle: string }[]>`select handle from public.profiles order by handle`;
    });
    expect(hidden.map((row) => row.handle)).not.toContain("theo");

    const code = await errorCodeOf(() =>
      asRole(sql, "anon", (tx) => tx`select trust_level from public.profiles`),
    );
    expect(code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  // The posts grant is a column list (#29): a column added later stays closed until
  // the grant names it. This fails when the table and the list drift, so the choice is
  // made on purpose — grant it, or add it to the private set here.
  test("may read every posts column except the private ones", async () => {
    // `announced_at` (#24) is bookkeeping for the follower notice, not content.
    const PRIVATE_POST_COLUMNS = ["agent_draft_md", "announced_at"];
    const all = await sql<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
    `;
    for (const role of BROWSER_ROLES) {
      const granted = await sql<{ column_name: string }[]>`
        select column_name from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'posts'
          and grantee = ${role} and privilege_type = 'SELECT'
      `;
      expect({ role, columns: granted.map((row) => row.column_name).sort() }).toEqual({
        role,
        columns: all
          .map((row) => row.column_name)
          .filter((column) => !PRIVATE_POST_COLUMNS.includes(column))
          .sort(),
      });
    }
  });

  test("never reads a voice guide or an agent's original draft (#29)", async () => {
    for (const role of BROWSER_ROLES) {
      const guide = await errorCodeOf(() =>
        asRole(
          sql,
          role,
          (tx) => tx`select voice_guide_md from public.profiles`,
          SEED.trustedMember,
        ),
      );
      const draft = await errorCodeOf(() =>
        asRole(
          sql,
          role,
          (tx) => tx`select agent_draft_md from public.posts`,
          SEED.trustedMember,
        ),
      );
      expect({ role, guide, draft }).toEqual({
        role,
        guide: INSUFFICIENT_PRIVILEGE,
        draft: INSUFFICIENT_PRIVILEGE,
      });
    }
  });

  test("reads tags, and only the tags of posts it can see", async () => {
    const tags = await asRole(
      sql,
      "anon",
      (tx) => tx<{ n: number }[]>`select count(*)::int as n from public.tags`,
    );
    expect(tags[0]?.n).toBe(4);

    const postTags = await asRole(
      sql,
      "anon",
      (tx) => tx<{ post_id: string }[]>`select post_id from public.post_tags`,
    );
    expect(postTags.map((row) => row.post_id)).not.toContain(SEED.pendingPost);
    expect(postTags).toHaveLength(2);
  });

  test("cannot call replace_post_tags: every write goes through a Manager", async () => {
    for (const role of BROWSER_ROLES) {
      const code = await errorCodeOf(() =>
        asRole(
          sql,
          role,
          (tx) => tx`select public.replace_post_tags(${SEED.publicPost}, '[]'::jsonb)`,
          SEED.trustedMember,
        ),
      );
      expect({ role, code }).toEqual({ role, code: INSUFFICIENT_PRIVILEGE });
    }
  });

  test("reads reactions on items it can see", async () => {
    const rows = await asRole(
      sql,
      "anon",
      (tx) => tx<{ n: number }[]>`select count(*)::int as n from public.reactions`,
    );
    expect(rows[0]?.n).toBe(3);
  });

  test("reads only approved media, and never the quarantine columns", async () => {
    const rows = await asRole(
      sql,
      "anon",
      (tx) => tx<{ id: string }[]>`select id, published_path from public.media_assets`,
    );
    expect(rows.map((row) => row.id)).toEqual([SEED.publishedMedia]);

    for (const column of [
      "storage_path",
      "original_filename",
      "sha256",
      "perceptual_hash",
    ]) {
      const code = await errorCodeOf(() =>
        asRole(sql, "anon", (tx) =>
          tx.unsafe(`select ${column} from public.media_assets`),
        ),
      );
      expect({ column, code }).toEqual({ column, code: INSUFFICIENT_PRIVILEGE });
    }
  });

  test("cannot read notifications at all", async () => {
    const code = await errorCodeOf(() =>
      asRole(sql, "anon", (tx) => tx`select 1 from public.notifications`),
    );
    expect(code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("a signed-in member", () => {
  test("reads their own drafts and pending posts, and nobody else's", async () => {
    const theo = await asRole(
      sql,
      "authenticated",
      (tx) => tx<{ slug: string }[]>`select slug from public.posts order by slug`,
      SEED.trustedMember,
    );
    expect(theo.map((row) => row.slug)).toEqual([
      "an-unlisted-note",
      "half-a-thought",
      "hello-from-the-porch",
      "welcome-to-porchlight",
    ]);

    const june = await asRole(
      sql,
      "authenticated",
      (tx) => tx<{ slug: string }[]>`select slug from public.posts order by slug`,
      SEED.probationMember,
    );
    expect(june.map((row) => row.slug)).toEqual([
      "an-unlisted-note",
      "first-post-waiting-for-the-light",
      "hello-from-the-porch",
      "welcome-to-porchlight",
    ]);
  });

  test("reads their own pending comment", async () => {
    const rows = await asRole(
      sql,
      "authenticated",
      (tx) =>
        tx<{ id: string }[]>`select id from public.comments where status = 'pending'`,
      SEED.probationMember,
    );
    expect(rows.map((row) => row.id)).toEqual([SEED.pendingComment]);

    const others = await asRole(
      sql,
      "authenticated",
      (tx) =>
        tx<{ id: string }[]>`select id from public.comments where status = 'pending'`,
      SEED.trustedMember,
    );
    expect(others).toEqual([]);
  });

  test("reads only their own notifications", async () => {
    const admin = await asRole(
      sql,
      "authenticated",
      (tx) =>
        tx<
          { recipient_id: string; post_id: string | null }[]
        >`select recipient_id, post_id from public.notifications`,
      SEED.admin,
    );
    // Every row is the admin's own and the seeded one is among them. Not a count: an
    // e2e run on the same database can leave the admin a bell of its own (#70).
    expect(admin.map((row) => row.post_id)).toContain(SEED.anonymousPendingPost);
    expect(admin.every((row) => row.recipient_id === SEED.admin)).toBe(true);

    const theo = await asRole(
      sql,
      "authenticated",
      (tx) =>
        tx<{ recipient_id: string }[]>`select recipient_id from public.notifications`,
      SEED.trustedMember,
    );
    expect(theo).toEqual([]);
  });

  test("reads their own quarantined upload but not a locked one", async () => {
    const before = await asRole(
      sql,
      "authenticated",
      (tx) => tx<{ id: string }[]>`select id from public.media_assets order by id`,
      SEED.probationMember,
    );
    expect(before.map((row) => row.id)).toEqual([
      SEED.publishedMedia,
      SEED.quarantinedMedia,
    ]);

    const afterLock = await asRole(sql, "service_role", async (tx) => {
      await tx`
        update public.media_assets
        set scan_status = 'locked', retain_until = now() + interval '1 year'
        where id = ${SEED.quarantinedMedia}
      `;
      // Switch roles inside the same transaction so the lock is visible and still rolls back.
      await tx.unsafe("set local role authenticated");
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: "authenticated", sub: SEED.probationMember })}, true)`;
      return tx<{ id: string }[]>`select id from public.media_assets order by id`;
    });
    expect(afterLock.map((row) => row.id)).toEqual([SEED.publishedMedia]);
  });

  test("still cannot write", async () => {
    const code = await errorCodeOf(() =>
      asRole(
        sql,
        "authenticated",
        (tx) => tx`update public.posts set title = 'mine' where id = ${SEED.draftPost}`,
        SEED.trustedMember,
      ),
    );
    expect(code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});
