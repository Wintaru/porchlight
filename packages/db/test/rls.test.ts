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

describe("anon", () => {
  test("reads only published, public posts", async () => {
    const rows = await asRole(
      sql,
      "anon",
      (tx) => tx<{ slug: string }[]>`select slug from public.posts order by slug`,
    );
    expect(rows.map((row) => row.slug)).toEqual([
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

  test("reads active profiles but not trust_level", async () => {
    const handles = await asRole(
      sql,
      "anon",
      (tx) =>
        tx<{ handle: string }[]>`select handle from public.profiles order by handle`,
    );
    expect(handles.map((row) => row.handle)).toEqual([
      "june",
      "lamplighter",
      "mira",
      "theo",
    ]);

    const code = await errorCodeOf(() =>
      asRole(sql, "anon", (tx) => tx`select trust_level from public.profiles`),
    );
    expect(code).toBe(INSUFFICIENT_PRIVILEGE);
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
  test("reads their own drafts, unlisted and pending posts, and nobody else's", async () => {
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
        tx<{ recipient_id: string }[]>`select recipient_id from public.notifications`,
      SEED.admin,
    );
    expect(admin.map((row) => row.recipient_id)).toEqual([SEED.admin]);

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
