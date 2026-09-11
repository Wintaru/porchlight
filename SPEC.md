# Porchlight — Build Spec

Version 1, 2026-09-11. This is the document a builder works from. Every rule here traces
to a decision on [WAYFINDER.md](WAYFINDER.md). The reasoning lives there and in
[PROPOSAL.md](PROPOSAL.md). If this spec and the map disagree, the map wins and this
spec has a bug.

## 1. What Porchlight is

A public, open-source community blog. Members and anonymous visitors share posts and
comments. An admin approves what shows. No karma, no downvotes, no leaderboards.
Search engines index every public page.

**Headline principle: members own their content, fully, always.** Copyright stays with
the author. One-click export. One-click erasure that deletes, not hides. Porchlight never
resells, licenses out, or trains on member content. The MIT license covers the code only.

**Standing constraints.** Self-hostable by anyone in any region. Err on the side of
caution for illegal and harmful content. A developer runs and tests everything locally
with no vendor keys. Every screen and flow has a Playwright test. Every external service
has a setup guide.

## 2. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js App Router on React, TypeScript strict |
| Database, auth, storage, realtime | Supabase (Postgres, Auth with Google OAuth, Storage, Realtime) |
| Editor | Tiptap. Markdown in, markdown out. |
| Stored content | Markdown (`body_md`) is canonical. Sanitized HTML (`body_html`) cached on save. |
| Monorepo | pnpm workspaces: `apps/web`, `packages/core`, `packages/db` |
| Boundary guard | `eslint-plugin-boundaries` enforcing the iDesign call graph |
| Tests | Vitest for units, Playwright for end to end |
| Local dev | `supabase start`, `pnpm dev`, seed data, fake providers |

## 3. Architecture

iDesign layering in `packages/core`. Next.js is the Client. Every public operation takes a
typed Request and returns a typed Response. Each Manager exposes `execute(request)` and
`query(request)`. Each request type has one handler file. All handlers register once at
the composition root. One public type per file. Each layer owns its `Requests/`,
`Responses/` and `Handlers/` folders.

| Layer | Components |
| --- | --- |
| Managers | `PostManager`, `CommentManager`, `MediaManager`, `ModerationManager`, `AccountManager`, `NotificationManager` |
| Engines | `ContentRenderEngine` (markdown to sanitized HTML), `PermissionEngine` (roles, trust, reserved handles), `QuotaEngine` (per-trust caps), `ModerationPolicyEngine` (scan results to clear, flagged, locked) |
| Accessors | `PostAccessor`, `CommentAccessor`, `ProfileAccessor`, `MediaStorageAccessor`, `HashMatchAccessor`, `ClassifierAccessor`, `ReportAccessor`, `AuditAccessor`, `NotificationAccessor`, `EmailAccessor` (phase 2) |
| Utilities | logger, ids and clock, markdown parser and sanitizer |

**Data access is hybrid.** Every write goes through a Manager on the server. Public reads
(feed, post page, profile) may query Supabase from the browser under RLS, but only from
one `read-model` module that the boundary lint fences. The browser may subscribe to
Supabase Realtime (notifications now, presence later). RLS policies are a real wall for
reads and get tests.

**Every external accessor has a fake mode** with toggles a developer can flip ("match",
"flag", "fail") to exercise the queue and the error paths without vendor keys.

## 4. People and access

Roles: `admin`, `moderator`, `member`. Signed-out visitors read everything public.

**Anyone can write. An admin decides what shows.**

- Anonymous visitors can post and comment. Nothing anonymous shows until an admin
  approves it.
- Members carry `trust_level`: `probation` (every post and comment waits for approval)
  or `trusted` (publishes at once). Admins promote by hand. An optional policy
  auto-promotes after N approved posts, default off.
- Sign-in is Google OAuth through Supabase Auth. No passwords.

**Anonymous claim flow.** On the first anonymous write the server creates
`anonymous_authors` with a random 256-bit secret stored as `sha256(secret)`. The raw
secret goes to the browser as an httpOnly, Secure, SameSite=Lax cookie and, once, as a
base32 claim code the person can save. Signed in later, `ClaimAnonymousPostsHandler`
hashes the cookie or the code, finds the row, moves `author_id` on its posts and
comments to the profile, and sets `claimed_by`. Lost if cookies are cleared and the code
was not saved. Anonymous posts live at `/p/slug` and 301 to `/@handle/slug` on claim.

**Anonymous guards, phase 1.** Cloudflare Turnstile on every anonymous submit. Rate
limits per IP and per anonymous token in a Postgres table. Images only for anonymous
uploads, hard-capped (3 files, 2 MB each to start). Links in anonymous text render inert
until approved. One-click admin block by anonymous token plus salted IP hash. Anonymous
authors get a status page keyed by their cookie and show the "Porch raccoon" avatar.

## 5. Content

- Posts: title, slug, `body_md`, `body_html`, cover image, summary (one line for the
  preview card), tags, `status` (`draft | pending | published | rejected | hidden |
  removed`), `visibility` (`public | unlisted`).
- Comments: threaded, `parent_id`, `depth` capped at 6 (deeper replies attach at 6 with
  an `@handle` mention), `status` (`pending | visible | rejected | hidden | removed |
  tombstone`).
- A CHECK constraint requires exactly one of `author_id` or `anonymous_author_id` on
  posts and comments, or neither for a tombstone.
- Reactions: a small fixed emoji set with counts on the item. Never totals on a profile,
  never a sort key.
- Feeds sort newest first. No vote-based ordering anywhere.
- URL shape: `/@handle/slug`. Author page `/@handle`. Reserved handles: `anon`, `p`,
  `admin`, `mod`, and every top-level route. Erased authors return 410 Gone.
- Unlisted posts are excluded from feeds, tag pages, sitemap, RSS, and carry `noindex`.
- The editor toolbar offers only what markdown can store.

## 6. Attachments

Allowlist, admin-extendable in site config. Default set: images (png, jpeg, gif, webp,
avif), PDF, Office without macros (docx, xlsx, pptx), OpenDocument, text, markdown, csv,
STL, GPX. Audio is off by default (DMCA exposure) and can be added in config. Denied
outright: executables, scripts, HTML, SVG, archives, macro-enabled Office.

The server checks magic bytes, not extensions. Non-image files are served as downloads
(`Content-Disposition: attachment`) from the storage origin, never inline on the site
origin. Per-file and per-account byte caps by trust level. Admin has no quota. Phase 1
stores in Supabase Storage behind `MediaStorageAccessor`. Video upload is phase 2.

## 7. Moderation and safety

**Every upload is quarantined until scanned and approved. Scanning cannot be turned off.**

Pipeline order is fixed inside `MediaManager`:

1. `HashMatchAccessor` — known-illegal image fingerprints. Default provider: Shield by
   Project Arachnid. Alternates: PhotoDNA, Cloudflare's tool as a second net.
2. `ClassifierAccessor` with a purpose-built image classifier (Hive or Sightengine) for
   violence, gore, sexual content, self-harm, and minors.
3. General classifier for text only (OpenAI Moderation or Claude). **A general LLM API
   never receives an image.**

`ModerationPolicyEngine` maps results to `media_assets.scan_status`:

- `clear` — proceeds to the normal approval queue.
- `flagged` — held. Shown blurred and grayscale in the queue with click-to-reveal.
  Cannot publish until a moderator decides.
- `locked` — a high-confidence hash match or minors-related hit. Frozen, hashed,
  audit-logged, hidden from moderators except an escalation view with metadata, and
  undeletable until `retain_until`. Thresholds tune only toward more caution.

**Site policy.** No gore, no self-harm imagery, no pornography. Artistic nudity is allowed
only when a moderator approves it with a mandatory `mature` tag. Mature items render
blurred with click-to-reveal and use the branded preview card, never the image.

**Evidence envelope.** Every post, comment and upload writes `submission_evidence` in the
same transaction: source IP and port, UTC timestamp, user agent, anonymous token id or
account id, Turnstile result, original filename and size, SHA-256 and perceptual hash,
request id. Original bytes stay untouched in quarantine (EXIF intact). Published image
copies are re-encoded with metadata stripped. Raw IP and port are kept for a
region-gated window (90 days to start), then nulled, leaving the salted hash. A locked
item sets `frozen = true`: envelope and original bytes are held for the retention period,
and account erasure skips them. The terms say so.

**Region setting.** The admin picks `US | EU | UK | CA | AU | other` at setup. It wires
the reporting target, the deadline, and the retention length, and shows a duty checklist
in the admin UI that links the setup guides. Global regardless of region: 1-year
retention, the audit log, and scanning always on. "Other" shows the maximum-caution
defaults and a plain warning to consult local law.

**Queue and tools.** Approval queue for pending posts and comments (anonymous and
probation). Reports with reasons that match the code of conduct plus a separate "illegal
content" reason that escalates at once. Actions: approve, approve as mature, reject with
reason, hide, remove, lock thread, suspend, ban, block anonymous token and IP hash,
escalate, mark member trusted. Every action writes `mod_actions` and the audit log.
Moderator wellbeing: blur and grayscale by default, an exposure counter, and no one ever
views a locked item.

## 8. Notifications

Phase 1 is in-app only. `NotificationAccessor` writes rows to `notifications`. The browser
subscribes to Supabase Realtime on its own rows and drives a bell that updates at once.

Events: `queue.pending` (admins and moderators), `reply.created` (parent author, fired
only when the reply becomes visible), `item.approved` and `item.rejected` (author, with
reason), `report.filed` (moderators), `mod.action` (affected author, with reason).

Phase 2 adds email through `EmailAccessor`, bundled as a digest on a member-set schedule,
with an immediate option for the admin queue.

## 9. Sharing and SEO

Server rendering for every public page. `sitemap.xml`, `robots.txt`, canonical URLs,
JSON-LD `Article`, RSS. OpenGraph and Twitter tags on every post. A generated preview
image per post through Next.js `opengraph-image`: cover image if set, else a branded card
with title and author. Author controls: pick the cover, write a one-line summary. No
per-post off switch. Share button copies the link and calls `navigator.share` where
available.

## 10. Export and erasure

**Export ships before erase.** Export produces markdown and JSON of everything a member
made: posts, comments, reactions, uploads. One click, no waiting period.

`EraseAccountHandler` runs in one transaction: hard-delete the member's posts and every
comment on them, hard-delete the member's media, tombstone the member's comments that
have replies (`status = tombstone`, `author_id = null`, `body_md = ''`), hard-delete
comments with no replies, set the profile to `erased` with personal fields nulled,
delete the auth user last. Frozen evidence is skipped. Deleted post URLs return 410.

The terms page states: comments on an erased post go with it, tombstones keep other
people's replies readable, frozen evidence outlives an erasure.

## 11. Data model

The ER diagram in [PROPOSAL.md](PROPOSAL.md) shows the main tables and their columns.
The full table list for phase 1: `profiles`, `anonymous_authors`,
`posts`, `comments`, `tags`, `post_tags`, `reactions`, `media_assets`,
`submission_evidence`, `reports`, `mod_actions`, `audit_log`, `notifications`, `quotas`,
`rate_limits`, `blocks`, `site_config`.

## 12. Screens

Nine approved boards on the design canvas:
https://claude.ai/code/artifact/9a8cf86a-2969-4c94-9105-ab98cab14397. Source in
`design/porchlight/`. Warm modern: cream #F6F1E8, surface #FFFCF7, ink #2A2622, muted
#75695C, amber #B4530A, glow #F2B441, danger #A83A2B, dark #221F1C. Newsreader for
titles, Source Sans 3 for body. Lamp mark and raccoon as inline SVG. Dark mode is warm
charcoal.

## 13. Documentation

README plus one guide per external service under `docs/setup/`: Supabase, Google OAuth,
Turnstile, storage, hash matching, classifiers, email. Each says what the service is for,
how to get credentials, where they go, and what the fake mode does without it. The admin
duty checklist links the same guides. Terms and code of conduct are phase 1 pages.

## 14. Phases

**Phase 1** — everything in sections 3 through 13 except where marked phase 2.
**Phase 2** — video upload (storage choice D4b, research favors R2), email
notifications, block and mute per member, full-text search, post revisions, presence.
**Phase 3** — digests, scheduled posts, collections, link previews, content warnings, PWA.

## 15. Out of scope

Video transcoding. ActivityPub. Karma, downvotes, leaderboards. A separate backend
service. Realtime features in phase 1 beyond the notification bell.

## 16. Open items

- **D17b** — Josh applies to Shield by Project Arachnid. Until approved, the fake hash
  provider runs and the admin checklist shows "hash matching: not yet active" in red.
- **D4b** — phase 2 video storage. Research done, decision parked.
- **Launch checklist** — domain and trademark check for the name Porchlight.
