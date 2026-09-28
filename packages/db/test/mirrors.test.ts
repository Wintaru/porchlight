import { readdirSync, readFileSync } from "node:fs";

import type { Sql, TransactionSql } from "postgres";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { HANDLE_PATTERN } from "../../core/src/Common/HandleShape";
import { SLUG_PATTERN } from "../../core/src/Common/SlugShape";
import { STAFF_ROLES } from "../../core/src/Common/UserRole";
import { VOICE_GUIDE_REVISIONS_KEPT } from "../../core/src/Common/VoiceGuideRevision";
import { VOICE_GUIDE_MAX_LENGTH } from "../../core/src/Common/VoiceGuideRules";
import { TAG_DESCRIPTION_MAX_LENGTH } from "../../core/src/Managers/SiteConfigManager/tagDescription";
import { postUsesMedia } from "../../core/src/Utilities/media/postUsesMedia";
import { connect, SEED, seededAs } from "./local-stack";

// Issue #94: a rule the core keeps in TypeScript and the schema keeps in SQL. The core
// needs its copy to refuse before the round trip and name the reason; the schema's copy
// is the last word. Each test reads the schema as the database has it now, so a
// migration that changes one side fails here until the other side follows.

let sql: Sql;

beforeAll(() => {
  sql = connect();
});

afterAll(async () => {
  await sql.end();
});

// The definition of a CHECK constraint as Postgres prints it back.
async function checkOf(name: string): Promise<string> {
  const rows = await sql<{ definition: string }[]>`
    select pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conname = ${name} and contype = 'c'
  `;
  const definition = rows[0]?.definition;
  if (rows.length !== 1 || definition === undefined) {
    throw new Error(
      `expected one CHECK constraint named ${name}, found ${String(rows.length)}`,
    );
  }
  return definition;
}

// The pattern of a `column ~ 'pattern'` CHECK.
async function patternOf(name: string): Promise<string> {
  const match = /~ '(.*)'::text/.exec(await checkOf(name));
  if (match?.[1] === undefined) {
    throw new Error(`${name} is not a single-pattern CHECK`);
  }
  return match[1].replaceAll("''", "'");
}

// The limit of a `char_length(column) <= n` CHECK.
async function maxLengthOf(name: string): Promise<number> {
  const match = /char_length\(\w+\) <= (\d+)/.exec(await checkOf(name));
  if (match?.[1] === undefined) {
    throw new Error(`${name} is not a single max-length CHECK`);
  }
  return Number(match[1]);
}

// The body of a function as its latest migration wrote it.
async function sourceOf(name: string): Promise<string> {
  const rows = await sql<{ source: string }[]>`
    select p.prosrc as source
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = ${name}
  `;
  const source = rows[0]?.source;
  if (rows.length !== 1 || source === undefined) {
    throw new Error(`expected one function public.${name}, found ${String(rows.length)}`);
  }
  return source;
}

describe("length limits", () => {
  test("a tag description is capped where the tags CHECK caps it", async () => {
    expect(await maxLengthOf("tags_description_length")).toBe(TAG_DESCRIPTION_MAX_LENGTH);
  });

  test("a voice guide is capped where the profiles CHECK caps it", async () => {
    expect(await maxLengthOf("profiles_voice_guide_length")).toBe(VOICE_GUIDE_MAX_LENGTH);
  });

  test("the trigger keeps as many voice guide revisions as the fake store", async () => {
    const limits = [
      ...(await sourceOf("keep_voice_guide_revision")).matchAll(/\blimit (\d+)/g),
    ].map((match) => Number(match[1]));
    expect(limits).toEqual([VOICE_GUIDE_REVISIONS_KEPT]);
  });
});

describe("shape rules", () => {
  test("the slug pattern is the posts and tags CHECK", async () => {
    expect(await patternOf("posts_slug_shape")).toBe(SLUG_PATTERN.source);
    expect(await patternOf("tags_slug_shape")).toBe(SLUG_PATTERN.source);
  });

  test("the handle pattern is the profiles CHECK", async () => {
    expect(await patternOf("profiles_handle_shape")).toBe(HANDLE_PATTERN.source);
  });
});

describe("staff roles", () => {
  test("is_staff_role holds the core's STAFF_ROLES", async () => {
    const rows = await sql<{ role: string }[]>`
      select r::text as role
      from unnest(enum_range(null::public.user_role)) as r
      where public.is_staff_role(r)
      order by 1
    `;
    expect(rows.map((row) => row.role)).toEqual([...STAFF_ROLES].sort());
  });

  test("the email claim asks is_staff_role instead of naming roles", async () => {
    const claim = await sourceOf("claim_member_emails");
    expect(claim).toContain("public.is_staff_role(");
    expect(claim).not.toMatch(/'(admin|moderator)'/);
  });
});

// #94: a schedule with no interval used to fall through to daily without a word.
describe("digest_interval", () => {
  test("gives every schedule an interval, and none to off", async () => {
    const rows = await sql<{ schedule: string; seconds: number | null }[]>`
      select s::text as schedule,
             extract(epoch from public.digest_interval(s))::integer as seconds
      from unnest(enum_range(null::public.digest_schedule)) as s
      order by 1
    `;
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      if (row.schedule === "off") {
        expect(row.seconds).toBeNull();
      } else {
        expect({ schedule: row.schedule, due: (row.seconds ?? 0) > 0 }).toEqual({
          schedule: row.schedule,
          due: true,
        });
      }
    }
  });

  test("both claim functions read it", async () => {
    for (const name of ["claim_member_emails", "claim_subscriber_emails"]) {
      const source = await sourceOf(name);
      expect({ name, uses: source.includes("public.digest_interval(") }).toEqual({
        name,
        uses: true,
      });
      expect(source).not.toMatch(/when 'hourly'/);
    }
  });
});

// #90: the editor sets aside the uploads its newest text uses with `postUsesMedia`,
// the database with `post_uses_media`. The same cases go through both.
describe("post_uses_media", () => {
  const MEDIA = "0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e";
  const OTHER = "11111111-2222-4333-8444-555555555555";
  const CASES = [
    { bodyMd: "no uploads here", coverMediaId: null },
    { bodyMd: "no uploads here", coverMediaId: MEDIA },
    { bodyMd: "no uploads here", coverMediaId: OTHER },
    { bodyMd: `![porch](https://x.test/public-media/${MEDIA}.jpg)`, coverMediaId: null },
    { bodyMd: `[video](https://x.test/public-media/${MEDIA}.mp4)`, coverMediaId: OTHER },
    { bodyMd: `the id alone: ${MEDIA}`, coverMediaId: null },
    { bodyMd: `upper case: ${MEDIA.toUpperCase()}`, coverMediaId: null },
    { bodyMd: `another upload: ${OTHER}`, coverMediaId: null },
    { bodyMd: "", coverMediaId: null },
  ] as const;

  test("the SQL rule and the core's copy agree on every case", async () => {
    for (const post of CASES) {
      const rows = await sql<{ uses: boolean }[]>`
        select public.post_uses_media(${post.bodyMd}, ${post.coverMediaId}::uuid, ${MEDIA}::uuid) as uses
      `;
      expect({ post, uses: rows[0]?.uses }).toEqual({
        post,
        uses: postUsesMedia(post, MEDIA),
      });
    }
  });
});

// #93: `search_candidates` reads past RLS (SECURITY DEFINER) so it can use the search
// indexes, and applies the listing rule itself: what RLS lets the caller read, public,
// and for comments visible. When RLS or the listing rule changes, this test fails until
// `search_candidates` follows. The seed holds every post status and visibility, every
// comment status, and posts by an anonymous and an erased author, all with one word.
// A private post (#101) is readable under RLS by its author only, and listed to nobody.
describe("search_candidates", () => {
  const WORD = "quillmirror";

  async function seedEveryCase(tx: TransactionSql): Promise<void> {
    await tx`
      insert into public.posts
        (author_id, anonymous_author_id, slug, title, body_md, status, visibility,
         published_at)
      select
        case when a.kind = 'anonymous' then null else a.id end,
        case when a.kind = 'anonymous' then a.id end,
        'mirror-' || a.kind || '-' || s || '-' || v,
        'Mirror ' || ${WORD},
        'A post with the word ' || ${WORD},
        s,
        v,
        case when s = 'published' then now() end
      from (values
        ('member', ${SEED.trustedMember}::uuid),
        ('erased', ${SEED.erasedMember}::uuid),
        ('anonymous', ${SEED.anonymousAuthor}::uuid)
      ) as a(kind, id)
      cross join unnest(enum_range(null::public.post_status)) as s
      cross join unnest(enum_range(null::public.post_visibility)) as v
      -- The two states the schema refuses (#101): a private post never waits in the
      -- queue, and an anonymous post is never private.
      where not (v = 'private' and (s = 'pending' or a.kind = 'anonymous'))
    `;
    await tx`
      insert into public.comments (post_id, author_id, status, body_md)
      select p.id,
        case when c = 'tombstone' then null else w.id end,
        c,
        case when c = 'tombstone' then '' else 'A comment with the word ' || ${WORD} end
      from public.posts p
      cross join unnest(enum_range(null::public.comment_status)) as c
      cross join (values (${SEED.trustedMember}::uuid), (${SEED.erasedMember}::uuid)) as w(id)
      where p.slug like 'mirror-%'
    `;
  }

  interface Candidates {
    readonly posts: string[];
    readonly comments: string[];
  }

  async function candidatesOf(tx: TransactionSql): Promise<Candidates> {
    const rows = await tx<{ post_id: string; comment_id: string | null }[]>`
      select post_id, comment_id from public.search_candidates(${WORD})
    `;
    return {
      posts: rows
        .filter((row) => row.comment_id === null)
        .map((row) => row.post_id)
        .sort(),
      comments: rows
        .flatMap((row) => (row.comment_id === null ? [] : [row.comment_id]))
        .sort(),
    };
  }

  // The listing rule on top of what RLS lets the caller read. `published` matters only
  // for an author, whom RLS also lets read their own drafts.
  async function listedUnderRls(tx: TransactionSql): Promise<Candidates> {
    const posts = await tx<{ id: string }[]>`
      select id from public.posts
      where slug like 'mirror-%' and visibility = 'public' and status = 'published'
      order by id
    `;
    const comments = await tx<{ id: string }[]>`
      select c.id from public.comments c
      join public.posts p on p.id = c.post_id
      where p.slug like 'mirror-%' and p.visibility = 'public' and p.status = 'published'
        and c.status = 'visible'
      order by c.id
    `;
    return {
      posts: posts.map((row) => row.id).sort(),
      comments: comments.map((row) => row.id).sort(),
    };
  }

  test("a visitor's candidates are exactly what RLS and the listing rule allow", async () => {
    const { candidates, listed } = await seededAs(
      sql,
      "anon",
      undefined,
      seedEveryCase,
      async (tx) => ({
        candidates: await candidatesOf(tx),
        listed: await listedUnderRls(tx),
      }),
    );

    expect(listed.posts.length).toBeGreaterThan(0);
    expect(listed.comments.length).toBeGreaterThan(0);
    expect(candidates).toEqual(listed);
  });

  test("a member's candidates are readable by that member and leave out a mute", async () => {
    const viewer = SEED.probationMember;
    const { candidates, listed, muted } = await seededAs(
      sql,
      "authenticated",
      viewer,
      async (tx) => {
        await seedEveryCase(tx);
        await tx`
          insert into public.member_blocks (member_id, target_id, level)
          values (${viewer}, ${SEED.trustedMember}, 'mute')
        `;
      },
      async (tx) => ({
        candidates: await candidatesOf(tx),
        listed: await listedUnderRls(tx),
        muted: (
          await tx<{ id: string }[]>`
            select id from public.posts where author_id = ${SEED.trustedMember}
            union all
            select id from public.comments where author_id = ${SEED.trustedMember}
          `
        ).map((row) => row.id),
      }),
    );

    // The muted member wrote a third of the posts and half of the comments.
    const unmuted = (ids: readonly string[]) => ids.filter((id) => !muted.includes(id));
    expect(candidates.posts.length).toBeGreaterThan(0);
    expect(candidates.comments.length).toBeGreaterThan(0);
    expect(listed.posts.length).toBeGreaterThan(candidates.posts.length);
    expect(listed.comments.length).toBeGreaterThan(candidates.comments.length);
    expect(candidates).toEqual({
      posts: unmuted(listed.posts),
      comments: unmuted(listed.comments),
    });
  });

  test("an author's own private posts are readable to them and never candidates", async () => {
    const { candidates, listed, readablePrivate } = await seededAs(
      sql,
      "authenticated",
      SEED.trustedMember,
      seedEveryCase,
      async (tx) => ({
        candidates: await candidatesOf(tx),
        listed: await listedUnderRls(tx),
        readablePrivate: (
          await tx<{ id: string }[]>`
            select id from public.posts
            where slug like 'mirror-%' and visibility = 'private'
          `
        ).length,
      }),
    );

    // RLS lets the author read every private post of theirs, so the listing rule is
    // what keeps them out, and search_candidates must apply it too.
    expect(readablePrivate).toBeGreaterThan(0);
    expect(candidates.posts.length).toBeGreaterThan(0);
    expect(candidates).toEqual(listed);
  });
});

// Every migration that changes erasure copies the whole of `erase_account`, and only
// the newest copy runs. A copy made from an older one would quietly drop what a later
// migration added. So each copy must touch every table the one before it touched.
// packages/db/test/erasure.test.ts checks the newest copy against the schema.
describe("erase_account copies", () => {
  const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url);

  function tablesTouched(definition: string): Set<string> {
    return new Set(
      [...definition.matchAll(/\b(?:delete from|update)\s+(public\.\w+)/g)].map(
        (match) => match[1] ?? "",
      ),
    );
  }

  test("each copy touches every table the copy before it touched", () => {
    const copies = readdirSync(MIGRATIONS)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .flatMap((name) => {
        const text = readFileSync(new URL(name, MIGRATIONS), "utf8");
        const start = text.search(
          /create (or replace )?function public\.erase_account\(/,
        );
        if (start < 0) {
          return [];
        }
        const end = text.indexOf("$$;", text.indexOf("$$", start) + 2);
        return [{ name, tables: tablesTouched(text.slice(start, end)) }];
      });

    expect(copies.length).toBeGreaterThan(1);
    for (let i = 1; i < copies.length; i += 1) {
      const before = copies[i - 1];
      const after = copies[i];
      if (before === undefined || after === undefined) continue;
      const dropped = [...before.tables].filter((table) => !after.tables.has(table));
      expect({ migration: after.name, dropped }).toEqual({
        migration: after.name,
        dropped: [],
      });
    }
  });
});
