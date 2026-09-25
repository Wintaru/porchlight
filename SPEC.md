# Porchlight — Build Spec

Version 1, 2026-09-11. This is the document a builder works from. Every rule here traces
to a decision on [WAYFINDER.md](WAYFINDER.md). The reasoning lives there and in
[PROPOSAL.md](PROPOSAL.md). If this spec and the map disagree, the map wins and this
spec has a bug.

## 1. What Porchlight is

A public, open-source community blog. Members and anonymous visitors share posts and
comments. An admin approves what shows. No karma, no downvotes, no leaderboards.
Search engines index every public page. It works as well for one person who blogs alone
as for a group of friends with their own blogs (D20). There is no mode switch: three
settings in section 4 and social features that hide with one author cover both.

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
| Database, auth, storage, realtime | Supabase (Postgres, Auth with Google OAuth and email links, Storage, Realtime) |
| Editor | Tiptap. Markdown in, markdown out. |
| Stored content | Markdown (`body_md`) is canonical. Sanitized HTML (`body_html`) cached on save. |
| Monorepo | pnpm workspaces: `apps/web`, `packages/core`, `packages/db` |
| Boundary guard | `eslint-plugin-boundaries` enforcing the iDesign call graph |
| Agent door | MCP endpoint at `/api/mcp` (Streamable HTTP, stateless, `@modelcontextprotocol/server`), bearer tokens minted in the app. Section 17. |
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
- Sign-in is Google OAuth or a one-time email link, both through Supabase Auth (D23).
  No passwords.

**Who can write is a setting, not a mode (D20).** Three `site_config` keys:

| Key | Values | Default |
| --- | --- | --- |
| `posting` | `anyone` (anonymous allowed) · `members` · `staff` (admin and moderator) | `anyone` |
| `comments` | `anyone` · `members` · `off` | `anyone` |
| `sign_up` | `open` (new members land on probation) · `invite` (phase 2 invite links) · `closed` | `open` |

`PermissionEngine` reads these on every write. A denied write returns a typed error, and
the editor and comment form hide when the actor cannot write. The setup wizard offers
three presets that only fill these keys: **Just me** (`staff` / `anyone` / `closed`),
**Friends** (`members` / `anyone` / `invite`), **Open porch** (`anyone` / `anyone` /
`open`). An admin can change any single key later on the site config page.

**Site identity** lives in `site_config` too: `site_name`, `site_tagline`, `about_md`.
Every page title, the feed header, the RSS channel and the branded preview card use
`site_name`. `/about` renders `about_md` and is a reserved route.

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
  removed`), `visibility` (`public | unlisted`), `comments_enabled` (default true, set
  by the author in the editor; the comment form hides and new comments are refused
  when false, existing comments stay visible).
- Comments: threaded, `parent_id`, `depth` capped at 6 (deeper replies attach at 6 with
  an `@handle` mention), `status` (`pending | visible | rejected | hidden | removed |
  tombstone`). Comments render oldest first inside a thread, so a conversation reads
  in order.
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
JSON-LD `Article`. OpenGraph and Twitter tags on every post. A generated preview
image per post through Next.js `opengraph-image`: cover image if set, else a branded card
with `site_name`, title and author. Author controls: pick the cover, write a one-line
summary. No per-post off switch. Share button copies the link and calls
`navigator.share` where available.

**Three RSS feeds (D21):** `/feed.xml` (everything public), `/@handle/feed.xml` (one
author), `/t/tag/feed.xml` (one tag). The site feed's channel title is `site_name`
alone; the author and tag feeds lead with their own name and carry `site_name` after it,
so three feeds in one reader are not indistinguishable. Each also carries
`<link rel="alternate">` on the matching page, and the same exclusions as the feed
(unlisted, pending, hidden never appear). Syndication to Discord or any other service
is pull: the author tags the post, and a bot subscribes to that tag's feed. Phase 3
adds push through `WebhookAccessor` (section 14).

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
`rate_limits`, `blocks`, `site_config`, `agent_tokens` (section 17).

## 12. Screens

Nine approved boards on the design canvas:
https://claude.ai/code/artifact/9a8cf86a-2969-4c94-9105-ab98cab14397. Source in
`design/porchlight/`. Warm modern: cream #F6F1E8, surface #FFFCF7, ink #2A2622, muted
#75695C, amber #B4530A, glow #F2B441, danger #A83A2B, dark #221F1C. Newsreader for
titles, Source Sans 3 for body. Lamp mark and raccoon as inline SVG. Dark mode is warm
charcoal.

## 13. Documentation

README plus one guide per external service under `docs/setup/`: Supabase, Google OAuth,
email sign-in, Turnstile, storage, hash matching, classifiers, email, and (phase 3) Discord webhooks.
Each says what the service is for, how to get credentials, where they go, and what the
fake mode does without it. The Discord guide also shows how to point a Discord RSS bot
at a tag feed, the phase 1 route. The admin duty checklist links the same guides. Terms,
code of conduct and `/about` are phase 1 pages.

## 14. Phases

**Phase 1** — everything in sections 3 through 13 except where marked phase 2, plus the
agent door in section 17 (tokens and post tools after posts land, upload tools after the
scan pipeline lands).
**Phase 2** — video upload (storage choice D4b, research favors R2), email
notifications, block and mute per member, full-text search, post revisions, presence.
Plus the social layer (D20): follow an author, follow a tag, a "Following" feed beside
"Everything" (shown only with two or more authors), `post.published` to followers,
invite links that land a friend as `trusted` (`sign_up = invite`), and new-post email
for readers who subscribe.
**Phase 3** — digests, scheduled posts, collections, link previews, content warnings, PWA.
Plus outbound webhooks on publish (D21): `WebhookAccessor` with a fake mode, a retry
rule, admin-set URLs in site config, a Discord-shaped payload as the first format, and
`docs/setup/discord-webhook.md`.

## 15. Out of scope

Video transcoding. ActivityPub. Karma, downvotes, leaderboards. A separate backend
service. Realtime features in phase 1 beyond the notification bell.

## 16. Open items

- **D17b** — Josh applies to Shield by Project Arachnid. Until approved, the fake hash
  provider runs and the admin checklist shows "hash matching: not yet active" in red.
- **D4b** — phase 2 video storage. Research done, decision parked.
- **Launch checklist** — domain and trademark check for the name Porchlight.

## 17. Agents (D22)

Porchlight is an MCP **server**. A member's own agent (Claude Code on the member's
subscription) is the client. Porchlight never calls a model vendor and needs no API key
for this. Design and reasoning: [AGENT-PUBLISHING-PROPOSAL.md](AGENT-PUBLISHING-PROPOSAL.md).

**The door.** `POST /api/mcp`, Streamable HTTP, stateless, built on
`@modelcontextprotocol/server`. Auth is `Authorization: Bearer plt_…`. The route is a
Client: it resolves the token to an actor once per request and maps each tool to one
Manager request. The server's MCP `instructions` state the house rules to every agent:
draft from the author's notes and voice guide only, do not pad, do not add a closing
summary, do not invent facts or opinions.

**Tokens.** `agent_tokens`: owner, name, `token_hash` (SHA-256 of `plt_` + 32 random
bytes, base64url), scopes, `expires_at`, `revoked_at`, `last_used_at`. Shown once on
`/settings`, section Agents. Scopes: `posts:draft` (default), `posts:publish`,
`media:upload`, `voice:write`. RLS denies the table to every browser role.

**The agent actor.** `Actor` gains `{ kind: "agent", profile, grant }`. `PermissionEngine`
rules on agents for every action, exhaustively. Agents may create, edit and delete their
member's **drafts**, upload with the scope, and publish only with the scope. Everything
else is denied: profile edits, moderation, erasure, token management, deleting a
published post. The member's trust level carries through unchanged: a probation member's
agent lands in `pending`. Text moderation and the upload quarantine apply as to any post.

**Provenance.** `posts.origin` (`editor | agent`), `posts.agent_token_id`,
`posts.agent_draft_md` (the agent's original text, frozen at first agent write),
`posts.reviewed_at` (first save or publish by a signed-in person). `submission_evidence`
gains `agent_token_id`. The drafts list and the queue show an "agent draft, not yet
reviewed" badge. The editor's publish button warns on an unreviewed agent draft. It
warns, it does not block.

**Voice guide.** `profiles.voice_guide_md`, edited on the settings page. `get_voice_guide`
returns it with the member's recent published posts where `origin = editor` as samples.
Agent-written posts never feed the guide. A default banned-phrase list ships as a named
constant. The guide exports and erases with the account (section 10).

**Settings** (D20-shaped, in `site_config`):

| Key | Values | Default |
| --- | --- | --- |
| `agents` | `members` · `staff` · `off` (`off` hides the Agents section and `/api/mcp` answers 403) | `members` |
| `agent_limits` | `{"drafts_per_day": n, "publishes_per_day": n}`, per token, through `rate_limits` | 5 and 2 |
| `agent_disclosure` | `off` · `footer` ("Drafted with an assistant, edited by @handle", or "Posted by an assistant for @handle" when unreviewed) | `footer` |

**Tools.** `get_me`, `get_voice_guide`, `update_voice_guide`, `list_posts`, `get_post`,
`create_draft`, `update_draft`, `delete_draft`, `publish_post`, `request_upload`,
`finalize_upload`, `get_media`. Uploads reuse the section 6 signed-URL flow: the agent's
client sends the bytes to storage itself, so they never pass through the model.

**Docs.** `docs/agents.md`: what the door is, how to mint a token, the `claude mcp add`
line, the notes-to-draft workflow, and the fake mode. No production step: tokens are
minted in the app.

**Later.** OAuth 2.1 for claude.ai connectors. A `check_draft` heuristic tool. A local
stdio wrapper. Voice guide revisions with phase 2 post revisions.
