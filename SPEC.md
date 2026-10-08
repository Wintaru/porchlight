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
`open`). An admin can change any single key later on the site config page. Each server
keeps a copy of `site_config` for up to 30 seconds, so a saved change is live at once on
the server that saved it and within 30 seconds everywhere else.

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

- Posts: title, slug, `body_md`, `body_html`, cover image, cover framing (a focus point
  and a zoom for the feed card), summary (one line for the preview card), tags, `status` (`draft | pending | published | rejected | hidden |
  removed`), `visibility` (`public | unlisted | private`), `comments_enabled` (default true, set
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
- The home feed shows a new post without a reload (D33). While the page is open and its
  tab is visible, it asks `/api/latest-post` once a minute for the newest public
  published post's time; a newer time re-renders the page in place. The route reads no
  cookie, the proxy skips it, and its answer is `public, s-maxage=30`.
- URL shape: `/@handle/slug`. Author page `/@handle`. Reserved handles: `anon`, `p`,
  `admin`, `mod`, and every top-level route. Erased authors return 410 Gone.
- Unlisted posts are excluded from feeds, tag pages, sitemap, RSS, and carry `noindex`.
- Private posts (D27, #101) are a journal: finished and dated, and only the author sees
  them. The author's own home feed (Everything), profile and post page show one with a
  lock chip, "Only you". Everyone else gets a 404, staff included, and it is in no
  other feed, tag page, search, RSS, sitemap, follower notice or reader email. RLS
  enforces this (`posts_public_read`, and `media_assets_public_read` for its uploads).
  No comments, reactions or reports. A private post never waits in the queue: Publish
  puts it up at once, even for a member on probation. Turning a published private post
  public or unlisted is a publish at that moment: up at once for a trusted member, with
  the one-time follower notice (#87), or into the queue for a member on probation. A
  post waiting in the queue that turns private leaves it. Only the author may make a
  post private, and not while it has a report no moderator has decided. Scanning, evidence, export and erasure treat it like any other post.
- The editor toolbar offers only what markdown can store.
- `posts.version` moves by one on every write (#100). An autosave sends the version
  its page last saw and changes nothing when the post was written since. The editor
  then says the post changed and keeps the text on the page. Save, Publish and an
  agent's `update_draft` send no version: the last of those wins.

## 6. Attachments

Allowlist, admin-extendable in site config. Default set: images (png, jpeg, gif, webp,
avif, heic), video (mp4), PDF, Office without macros (docx, xlsx, pptx), OpenDocument,
text, markdown, csv, STL, GPX. Audio is off by default (DMCA exposure) and can be added
in config. Denied outright: executables, scripts, HTML, SVG, archives, macro-enabled
Office.

The server checks magic bytes, not extensions. Non-image files are served as downloads
(`Content-Disposition: attachment`) from the storage origin, never inline on the site
origin; a video plays in the post. Per-file and per-account byte caps by trust level,
and a per-file video cap (probation none, trusted 250 MiB). Admin has no quota. Media
lives in Supabase Storage behind `MediaStorageAccessor`.

**Video (D4b).** The server never converts video. The editor converts it in the
browser to H.264 MP4 of at most 1080p with AAC sound, movie box first, no metadata. The
server reads the header and movie box and refuses anything else. The public copy is a
storage copy of the checked file. **HEIC** photos are decoded on the server and
published as AVIF. **Video links:** a YouTube, Vimeo or Imgur video link alone on its
line renders as a player; YouTube and Vimeo stay a card that loads nothing from the
service until the reader presses it. Linked videos are not scanned.

**Uploads and posts (#80).** Each upload belongs to one post: the one the editor
uploaded it for, or else the first post of its owner that used it. The editor lists
only that post's uploads, so a picture used in a second post is uploaded again. When
the author presses Save or Publish, or an agent changes a draft with `update_draft`
(#90), an upload a saved version used and the post no longer uses is deleted. An upload
the text just saved uses is kept, whatever a late autosave wrote. Autosave never
deletes, so an upload taken out and put back before Save survives, and one uploaded and
not put in yet stays. Deleting your post deletes your uploads in it. An upload that any
post or comment still shows, anyone's, is kept, and so is a locked one. Remove refuses
such an upload and says why. Uploads in no post (made before posts owned uploads, or left by a
post a moderator deleted) are listed apart and folded, so the member can still put one
in or remove it.

## 7. Moderation and safety

**Every upload is quarantined until scanned and approved. Scanning cannot be turned off.**

Pipeline order is fixed inside `MediaManager`:

1. `HashMatchAccessor` — known-illegal image fingerprints. Default provider: Shield by
   Project Arachnid. Alternates: PhotoDNA, Cloudflare's tool as a second net.
2. `ClassifierAccessor` with a purpose-built image classifier (Hive or Sightengine) for
   violence, gore, sexual content, self-harm, and minors.
3. General classifier for text only (OpenAI Moderation or Claude). **A general LLM API
   never receives an image.**

A hash match stops the pipeline: the file is locked, and the classifier never receives
it. A video goes to the first two by a short-lived signed link, and each checks its frames.
A provider with no video scan fails the upload rather than let it through, except under
`ALLOW_FAKE_PROVIDERS=1`, where the fake answers for video and the admin checklist shows
the video classifier red. Hash matching still runs on every video. A HEIC photo
goes as a JPEG of the same pixels.

`ModerationPolicyEngine` maps results to `media_assets.scan_status`:

- `clear` — proceeds to the normal approval queue.
- `flagged` — held. Shown blurred and grayscale in the queue with click-to-reveal.
  Cannot publish until a moderator decides. A held upload that is not a waiting post's
  cover is its own queue item (#90): approve as mature (then it is a cover only) or
  reject with a reason (it stays held, and its owner is told).
- `locked` — a high-confidence hash match or minors-related hit. Frozen, hashed,
  audit-logged, hidden from moderators except an escalation view with metadata, and
  undeletable until `retain_until`. Thresholds tune only toward more caution.

**Site policy.** No gore, no self-harm imagery, no pornography. Artistic nudity is allowed
only when a moderator approves it with a mandatory `mature` tag. Mature items render
blurred with click-to-reveal and use the branded preview card, never the image. A post
with the `mature` content note is blurred whole, cover and body, behind one click, and
no card, feed, digest or unfurl shows its summary (#117).

**Evidence envelope.** Every post, comment and upload writes `submission_evidence`: an
upload in the same transaction, a post or comment right after it is stored, a post
again when it is published, hashing the text that went out (D24), and again each time an
agent changes a published post's title or body (D32b). Each row holds source
IP and port, UTC timestamp, user agent, anonymous token id or account id, Turnstile
result, original filename and size, SHA-256 and perceptual hash, request id. Original bytes stay untouched in quarantine (EXIF intact). Published image
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
probation). Nothing of a private post reaches staff (D27): not the post, not a comment
on it, not a held upload in it, not a report on it. Its uploads are still scanned and
held, and a held one joins the queue when its post goes public. Reports with reasons that match the code of conduct plus a separate "illegal
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
with `site_name`, title and author. Author controls: pick the cover (a new upload, or
any image already uploaded to the post; the post's first picture fills an empty cover
once), frame it for the feed card, write a one-line summary. Every feed card's cover box
has one shape (16:10) on every screen, so one framing fits all of them; the post page
and the share card show the whole cover. With no summary, the body's first sentence (`posts.excerpt`) is used on the
share card, the feed card and the RSS item. No per-post off switch. Share button copies the link and calls
`navigator.share` where available.

**Three RSS feeds (D21):** `/feed.xml` (everything public), `/@handle/feed.xml` (one
author), `/t/tag/feed.xml` (one tag). The site feed's channel title is `site_name`
alone; the author and tag feeds lead with their own name and carry `site_name` after it,
so three feeds in one reader are not indistinguishable. Each also carries
`<link rel="alternate">` on the matching page, and the same exclusions as the feed
(unlisted, private, pending, hidden never appear). Syndication to Discord or any other service
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
The member's notifications, quota, email settings and every reader subscription under
their address go too. Reports, moderation actions, the audit log and admin records keep
the erased profile's id as accountability. A db test lists every foreign key to
`profiles` and `auth.users` and fails when erasure does not handle one (#83).

The terms page states: comments on an erased post go with it, tombstones keep other
people's replies readable, frozen evidence outlives an erasure, and erased data stays in
a backup until that backup expires (seven days, section 21).

## 11. Data model

The ER diagram in [PROPOSAL.md](PROPOSAL.md) shows the main tables and their columns.
The full table list for phase 1: `profiles`, `anonymous_authors`,
`posts`, `comments`, `tags`, `post_tags`, `reactions`, `media_assets`,
`submission_evidence`, `reports`, `mod_actions`, `audit_log`, `notifications`, `quotas`,
`rate_limits`, `blocks`, `site_config`, `agent_tokens` (section 17). Phase 4 adds
`site_moves` and `transfer_codes` (section 19) and `backup_runs` (section 21).

## 12. Screens

Nine approved boards on the design canvas:
https://claude.ai/code/artifact/9a8cf86a-2969-4c94-9105-ab98cab14397. Source in
`design/porchlight/`. Warm modern: cream #F6F1E8, surface #FFFCF7, ink #2A2622, muted
#75695C, amber #B4530A, glow #F2B441, danger #A83A2B, dark #221F1C. Newsreader for
titles, Atkinson Hyperlegible Next for body. Lamp mark and raccoon as inline SVG. Dark
mode is warm charcoal. These values are the **Porch** theme, the default (section 18).

## 13. Documentation

README plus one guide per external service under `docs/setup/`: Supabase, Google OAuth,
email sign-in, Turnstile, storage, hash matching, classifiers, email, and (phase 3) Discord webhooks.
Each says what the service is for, how to get credentials, where they go, and what the
fake mode does without it. The Discord guide also shows how to point a Discord RSS bot
at a tag feed, the phase 1 route. The admin duty checklist links the same guides. Terms,
code of conduct and `/about` are phase 1 pages. Phase 4 adds `docs/themes.md` (section
18), `docs/moving-a-site.md` (section 19), `docs/setup/self-host.md` (section 21),
`docs/releasing.md` and `CHANGELOG.md` (section 21).

## 14. Phases

**Phase 1** — everything in sections 3 through 13 except where marked phase 2, plus the
agent door in section 17 (tokens and post tools after posts land, upload tools after the
scan pipeline lands).
**Phase 2** — video upload (D4b: Supabase Storage, browser conversion), email
notifications, block and mute per member, full-text search, post revisions, presence.
Plus the social layer (D20): follow an author, follow a tag, a "Following" feed beside
"Everything" (shown only with two or more authors), `post.published` to followers,
invite links that land a friend as `trusted` (`sign_up = invite`), and new-post email
for readers who subscribe.
**Phase 3** — digests, scheduled posts, collections, link previews, content warnings, PWA.
Plus outbound webhooks on publish (D21): `WebhookAccessor` with a fake mode, a retry
rule, admin-set URLs in site config, a Discord-shaped payload as the first format, and
`docs/setup/discord-webhook.md`.
**Phase 4** — themes (section 18), moving a site (section 19), `pnpm setup:check`
(section 20), and the Docker self-host with versioned releases (section 21).

## 15. Out of scope

Video transcoding. ActivityPub. Karma, downvotes, leaderboards. A separate backend
service. Realtime features in phase 1 beyond the notification bell.

## 16. Open items

- **D17b** — Josh applies to Shield by Project Arachnid. Until approved, the fake hash
  provider runs and the admin checklist shows "hash matching: not yet active" in red.
- **Launch checklist** — domain and trademark check for the name Porchlight.

## 17. Agents (D22)

Porchlight is an MCP **server**. A member's own agent (Claude Code on the member's
subscription) is the client. Porchlight never calls a model vendor and needs no API key
for this. Design and reasoning: [AGENT-PUBLISHING-PROPOSAL.md](AGENT-PUBLISHING-PROPOSAL.md).

**The door.** `POST /api/mcp`, Streamable HTTP, stateless, built on
`@modelcontextprotocol/server`. Auth is `Authorization: Bearer plt_…`, or an OAuth
access token from a connector (below). The route is a
Client: it resolves the token to an actor once per request and maps each tool to one
Manager request. The server's MCP `instructions` state the house rules to every agent:
draft from the author's notes and voice guide only, do not pad, do not add a closing
summary, do not invent facts or opinions.

**Tokens.** `agent_tokens`: owner, name, `token_hash` (SHA-256 of `plt_` + 32 random
bytes, base64url), scopes, `expires_at`, `revoked_at`, `last_used_at`. Shown once on
`/settings`, section Agents. Scopes: `posts:draft` (default), `posts:publish`,
`posts:edit` (D32), `media:upload`, `voice:write`. RLS denies the table to every browser role.

**The agent actor.** `Actor` gains `{ kind: "agent", profile, grant }`. `PermissionEngine`
rules on agents for every action, exhaustively. Agents may create, edit and delete their
member's **drafts**, upload with the scope, and publish only with the scope. With the
opt-in `posts:edit` scope (D32), an agent may also change its member's own **published**
post through `update_draft`; it never deletes one, never touches a pending or rejected
post, never unpublishes one, and never changes its visibility. These edits have no
daily cap (D32b). Each change to the title or body writes a `submission_evidence` row
that names the token. A private
post (D27) is read only by its own member's agent with `posts:draft`, the scope that
reads the member's drafts. Everything
else is denied: profile edits, moderation, erasure, token management, deleting a
published post. The member's trust level carries through unchanged: a probation member's
agent lands in `pending`. Text moderation and the upload quarantine apply as to any post.

**Provenance.** `posts.origin` (`editor | agent`), `posts.agent_token_id`,
`posts.agent_draft_md` (the agent's original text, frozen at first agent write),
`posts.reviewed_at` (first save or publish by a signed-in person). `submission_evidence`
gains `agent_token_id`. The drafts list and the queue show an "agent draft, not yet
reviewed" badge. The editor's publish button warns on an unreviewed agent draft. It
warns, it does not block. `posts.agent_edited_at` (D32) is set when an agent changes a
published post and cleared by a person's next save; while it is set, the posts list shows
"changed by an agent, not yet reviewed".

**Voice guide.** `profiles.voice_guide_md`, edited on the settings page. `get_voice_guide`
returns it with the member's recent published posts where `origin = editor` as samples.
Agent-written posts never feed the guide. A default banned-phrase list ships as a named
constant. The guide exports and erases with the account (section 10).

**Settings** (D20-shaped, in `site_config`):

| Key | Values | Default |
| --- | --- | --- |
| `agents` | `members` · `staff` · `off` (`off` hides the Agents section and `/api/mcp` answers 403) | `members` |
| `agent_limits` | `{"drafts_per_day": n, "publishes_per_day": n}`, per token, through `rate_limits` | 5 and 2 |
| `agent_disclosure` | `off` · `footer` ("Drafted with an assistant, edited by @handle", or "Posted by an assistant for @handle" when unreviewed, or "Last changed by an assistant for @handle" while `agent_edited_at` is set) | `footer` |

**Tools.** `get_me`, `get_voice_guide`, `update_voice_guide`, `check_draft`, `list_posts`, `get_post`,
`create_draft`, `update_draft`, `delete_draft`, `publish_post`, `request_upload`,
`finalize_upload`, `get_media`. Uploads reuse the section 6 signed-URL flow: the agent's
client sends the bytes to storage itself, so they never pass through the model.

**OAuth for connectors** (#79, D25). claude.ai connectors use OAuth 2.1, with Supabase
Auth as the authorization server and dynamic client registration. The door's 401 names
the protected-resource metadata (`/.well-known/oauth-protected-resource/api/mcp`, RFC
9728), which names Auth. Auth sends the member to `/oauth/consent`, where they pick the
scopes; Auth has no custom scopes, so the choice is stored as an `agent_tokens` row keyed
by `oauth_client_id` instead of a hash. A bearer that is not `plt_` must be an Auth JWT
with a `client_id` claim, and resolves through the member's live grant for that client to
the same `agent` actor. A member's own session JWT has no `client_id` and is refused.
Revoking the grant in settings shuts the door at once and withdraws the consent at Auth.

**Docs.** `docs/agents.md`: what the door is, how to mint a token, the `claude mcp add`
line, the notes-to-draft workflow, and the fake mode. Tokens need no production step.
`docs/setup/mcp-oauth.md`: the Supabase Auth switches for OAuth connectors.

**Draft check** (#32). `check_draft(body_md)` and the editor's Check button run the same
deterministic heuristics against the writer's own guide: banned phrases (the default list
plus the list under a "banned" heading in the guide), sentences all one length, many lists
of three, a heading over nearly every paragraph, a closing summary. A phrase matches at
the start of a longer word ("ai" matches "aim"). A closing summary that opens with a
banned phrase that is also a summary opening ("in conclusion") is one warning, not two
(#97). Warnings, never a block. **Voice guide revisions** (#32): each change keeps the text it replaced, up to 50,
shown under the guide in Settings, exported and erased with the account.

**Later.** A local stdio wrapper.

## 18. Themes (D28)

A theme gives values to the color and font tokens. It changes no layout, no screen and
no approved board. The admin picks one theme for the whole site. Readers keep following
their device's light or dark setting.

**Tokens name a role, not a color.** `--ground` (was `--cream`), `--accent` (was
`--amber`), `--accent-strong` (was `--amber-dark`), and so on. The full list is one
`const` array in `packages/themes`. A blue theme never sets a token called `--amber`.

**No color outside the tokens.** Every color in a CSS module, a component, the header's
dusk sky, the lamp and raccoon marks, the preview card image (`opengraph-image.tsx`),
the favicon and the email layout comes from the active theme. CSS reads `var(--…)`.
Code that cannot read CSS (the preview card, the favicon route, `emailLayout`) reads the
same values from `packages/themes`. A test fails on a hex or `rgb()` color outside
`packages/themes` and test files.

**A theme is one file.** `packages/themes/src/<id>.ts` exports `{ id, name, light, dark,
fonts }`. `light` and `dark` are typed as a record over the token list, so a missing
token does not compile. Fonts are local files declared once in a font registry, never a
network fetch (D19). The root layout writes the active theme's tokens into the page
from the server, so a page never flashes the default first. Emails use the theme's
`light` values. The web app and the core both read `packages/themes`.

**The contrast test.** For each theme, in light and in dark, every text pair on a named
list (body text on ground, muted on ground, link on ground and on surface, and the rest)
reaches 4.5:1. Every control pair (accent on ground, strong line on surface, focus ring)
reaches 3:1. The pair list is a `const` in `packages/themes`, beside the token list.

**The setting.** `site_config.theme`, default `porch`. An Appearance section on `/admin`
(admin only) shows each theme as a light and a dark swatch. A saved change is live
within 30 seconds (section 4). A saved theme that no longer exists renders as Porch, and
the Appearance section names the missing one.

Porchlight ships Porch and at least one other theme. `docs/themes.md` tells an operator
how to add a theme file and rebuild.

Rejected: layout themes, a theme for each reader, color pickers on `/admin`.

## 19. Moving a site (D29, D29b, D29c)

This moves one Porchlight site to a new host. It is not a way to leave Porchlight: that
is each member's own export (section 10). Both sites must run the same Porchlight
version.

**Export (old site).** A "Move this site" section on `/admin`, admin role only. Before a
job starts, the admin must have signed in within the last 10 minutes, else Porchlight
sends them through sign-in again. Starting an export writes the audit log, and every
other admin gets an email and a bell item (`site.exported`). One export runs at a time.
The section shows the state (building, ready, failed with the reason and Retry). The
section also says that writes after the export do not move, and shows `posting`,
`comments` and `sign_up` with a link to Access, so the admin can close the porch first.

**The archive.** A zip in the private `site-moves` bucket: `manifest.json` (Porchlight
version, the name of the latest migration, the source site URL, row counts, a SHA-256 for
each file) and one JSON Lines file for each table, plus the Auth users and their
identities. It holds the database only, no media. Every table is in it except a named
skip list (`rate_limits` and other short-lived rows). A db test lists every table and
fails when one is in neither list. The download link and the file expire after 24 hours,
and "Delete now" removes the file sooner.

**Background work.** A `site_moves` row holds each job's state. `pg_cron` calls a step
route with `CRON_SECRET` every minute, and each call does a bounded batch, so no single
request runs long. The same stepper runs export and import.

**Transfer code (old site).** Beside the export, the admin makes a transfer code. It is
shown once and stored as a hash in `transfer_codes`. It expires after 24 hours, the
admin can revoke it, and each use writes the audit log. A server that holds the code can
list every file (published and quarantined, with its bucket, path, size and SHA-256) and
ask for one signed storage link at a time, valid for five minutes. No key changes hands,
the archive alone unlocks no file, and **no file passes through a browser.**

**Import (new site).** "Import a site" shows on `/admin` only while the site holds the
admin profile of `PORCHLIGHT_ADMIN_EMAIL` and no posts or comments (D29b). The admin
uploads the archive straight to the `site-moves` bucket, never through a request body,
and pastes the old site's URL and transfer code. The import then:

1. Refuses when the latest migration differs, and names both Porchlight versions.
2. Refuses when no member in the archive is an admin with the same email.
3. Pulls every file from the old site, server to server, into the same bucket and path.
   It checks each SHA-256, skips a file already copied with the right hash, and keeps
   every `retain_until`.
4. Loads the database in one transaction. It removes the lone admin profile and its
   Auth user, and inserts the archive's Auth users and identities with their own ids, so
   a Google sign-in or an email link finds the moved account.
5. Renders every post again, so media links point at the new host. Sets the region row
   on the duty checklist to red until the admin confirms the region (D17). Writes the
   audit log.

A failed import shows the reason and Retry. The transaction rolls back, copied files
stay for the retry, and the site stays empty. Every person signs in again after a move.
`plt_` agent tokens keep working. OAuth connector grants do not move. A claim code still
works where an old cookie does not. Reader subscriptions move with the database.

`docs/moving-a-site.md` covers both sides, says to keep the old site up until the import
ends and the new site is checked, and links the region guide.

Rejected: a command-line export, a neutral format for Ghost or WordPress, a merge into a
live site, media in the archive with the old site's key, signed links in the archive.

## 20. Setup check (D30)

`pnpm setup:check` reads the live hosted site and prints one row for each step in
`docs/deploy.md`: green, red, or "cannot check" with the reason (a missing
`SUPABASE_ACCESS_TOKEN`, `vercel` or `gh` not installed). It is read-only and exits
non-zero when a row is red. A provider left on `fake` is red, as on the duty checklist.
It never prints a secret value, only whether it is set.

**Steps are defined once,** in the script: an id, a check, and a fix or manual text. Each
`deploy.md` section carries its step id in a comment. A test fails when a section has no
step id or a step id has no section. `deploy.md` stays hand-written.

**`--fix`** changes what a tool can change: the Supabase Management API (sign-in URLs,
providers, the OAuth server, Realtime public access, the upload limit), the Vercel CLI
(environment variables) and `gh` (secrets and variables). It shows each change and asks
before it makes it. It prints the old value first when it is not a secret. One failed fix
does not stop the rest, and a summary comes at the end. A step that needs a browser
(Google OAuth client, Turnstile, Arachnid Shield, the Resend domain) prints the link and
what to paste.

A self-host has no Management API. Its rows say "not for a self-host" and point at
`docs/setup/self-host.md`.

Rejected: a checker with no fixes, a one-time guided installer, `deploy.md` generated from
the script.

## 21. Self-host with Docker (D31, D31b)

blog.abandonedbits.com stays on Vercel and hosted Supabase. The Docker path is for other
operators. Local development stays on the Supabase CLI (D19).

**Versions.** Josh tags `v0.x` releases. `CHANGELOG.md` says what each version changes and
any step an operator must take. CI builds the web image (`output: "standalone"`) for x86
and ARM on each tag and publishes it to GHCR. `docs/releasing.md` lists Josh's steps.

**The compose** (`deploy/docker/`) runs the whole stack on one machine: the web image at a
pinned version, Supabase's self-host images, Caddy for HTTPS, a one-shot service that
runs the migrations and sets the `pg_cron` secrets on each start, and the backup service.
Studio and Postgres listen on localhost only. `.env.example` leaves every provider unset,
never `fake`, so the duty checklist is red until the operator fills it. Auth email links
need SMTP values in `.env`. An update is: read the CHANGELOG, change the pinned version,
`docker compose pull && docker compose up -d`.

**Backups come first in the guide.** Each night the backup service dumps the database and
copies both buckets to an S3-compatible target named in `.env`, and keeps seven. Each run
writes a `backup_runs` row. On a self-host the duty checklist shows the last backup time,
red when it is older than 48 hours or when no off-machine target is set. The guide has
the restore steps, and CI tests a restore into a fresh stack.

**CI** builds the image and starts the compose on each tag, then runs a Playwright smoke
test: the home page loads, an email-link sign-in works, and a post publishes.

**Agent connectors.** `plt_` tokens work on a self-host. The guide does not promise OAuth
connectors (D25) until the Auth OAuth 2.1 server is tested on the self-host image.

`docs/setup/self-host.md` covers the machine size (8 GB RAM recommended), backups, the
`.env` values, HTTPS, the first sign-in, updates, and moving in from a hosted site
(section 19). Research: [docs/research/D31-hosting-costs.md](docs/research/D31-hosting-costs.md).

Rejected: moving Josh's site now, an app-only image, a rolling image from `main`.
