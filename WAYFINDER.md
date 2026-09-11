# Wayfinder — Porch (working name)

Created 2026-09-11. Backend: markdown (no git remote yet). One decision per session.
See [PROPOSAL.md](PROPOSAL.md) for the full sketch and the reasoning behind each recommendation.

## Destination

A safe, searchable, open-source community blog with iDesign server layers, ready to scaffold.
Members share posts and comment. No karma, no downvotes, no leaderboards. Public pages that
search engines index. Admin and moderator controls that make it a safe place.

Headline principle: **members own their content fully, always.** One-click export and one-click
erasure. Porch never resells, licenses out, or trains on member content. See the principle
section in [PROPOSAL.md](PROPOSAL.md).

## Decisions so far

- 2026-09-11 — **D0 Product shape: a porch, not a forum.** A blog with many authors and threaded comments. Feeds sort by time, not by votes. Josh confirmed the framing.
- 2026-09-11 — **D8 License: MIT.** Josh picked maximum adoption over copyleft. AGPL-3.0 rejected.
- 2026-09-11 — **D1 Framework: Next.js App Router.** Server rendering and SEO APIs built in, Supabase SSR docs, largest contributor pool. React Router v7 and Astro rejected.
- 2026-09-11 — **D2 Data access: hybrid.** Every write goes through a Manager. Public reads may call Supabase from the browser under RLS, but only from one `read-model` module that a lint rule fences. Realtime and presence (typing indicators, who is online) stay possible through browser channels. Not planned yet, not ruled out. Server-only rejected because it discards Supabase features out of hand.
- 2026-09-11 — **D3 Content format: markdown + cached HTML.** Markdown is the source of truth. A server engine renders sanitized HTML once on save. ProseMirror JSON rejected (not readable, ties data to Tiptap). Storing both rejected (two copies that drift).
- 2026-09-11 — **D4 Media storage: Supabase Storage, images only, for phase 1.** Video upload moves to phase 2 so the Free plan works now (50 MB cap, 1 GB). One `MediaStorageAccessor` contains the volatility, so the phase 2 swap to R2 or S3 is one file. Research: [docs/research/D4-media-storage.md](docs/research/D4-media-storage.md). R2-from-day-one rejected as a second vendor before there is a need.
- 2026-09-11 — **D5 Erasure of comments: tombstone.** A comment with replies keeps an empty `[deleted]` slot with no body and no author. A comment with no replies is hard-deleted. Cascade delete rejected (erases other members' words). Reparenting rejected (replies end up under the wrong parent).
- 2026-09-11 — **D6 Erasure of posts: delete with the post.** Other people's comments on an erased post go with it. The terms say so, and every member can export their own data any time. Tombstoned posts rejected (ghost pages in search). Grace period rejected (content lingers after an erase request).
- 2026-09-11 — **D7 Membership: anonymous allowed, approval gate, trust levels.** Anyone can post or comment without an account. Nothing anonymous shows until an admin approves it. Members are on **probation** (posts and comments need approval) or **trusted** (publish at once). Admins promote by hand, and an optional policy can auto-promote after N approved posts (default off). An anonymous poster gets a secret httpOnly cookie plus a one-time claim code, so they can claim their posts after they create an account. Lost if cookies are cleared and the code was not saved. The three-mode switch (open, invite, approve) is rejected in favor of this. Guards for anonymous input are a phase 1 requirement (Turnstile, rate limits per IP and per anonymous token, no media for anonymous).
- 2026-09-11 — **D13 Notification events, phase 1: all five.** Pending item in the queue → admins and moderators. Reply to your post or comment → author, only once the reply is visible. Your item approved or rejected → author, with the moderator's reason. Report filed → moderators. Mod action on your content → author, with the reason. Anonymous authors get a status page keyed by their cookie (pending, approved, rejected, reply counts), no push. Anonymous authors show a deliberately unflattering placeholder avatar as a nudge to make an account — the exact avatar is a D12 design call.
- 2026-09-11 — **D14 Notification channels: in-app now, email in phase 2. Bell is immediate, email is a digest.** A `notifications` table and Supabase realtime drive a live bell. Email arrives in phase 2 through one `EmailAccessor`, bundled on a member-set schedule, with an immediate option for the admin queue only. Email-from-day-one rejected (deliverability setup before launch). Email-only rejected (no live feel, ignores realtime). Everything-immediate rejected (noisy inboxes as the porch grows).
- 2026-09-11 — **D15 Anonymous guards, phase 1: Turnstile on every anonymous submit, rate limits per IP and per anonymous token (a small Postgres table, no Redis), images only with a small hard cap (for example 3 files, 2 MB each), links inert until approved, one-click admin block by anonymous token plus salted IP hash.** Moderators see full content through the same sanitizer as published pages. Documents from anonymous authors rejected (a PDF is the classic phishing carrier). Plain-text-only queue view rejected (a mod cannot judge what readers would see).
- 2026-09-11 — **D16 Attachments: an allowlist that admins can extend in site config.** Default set: images (png, jpeg, gif, webp, avif), PDF, Office without macros (docx, xlsx, pptx), OpenDocument, text, markdown, csv, STL (3D models), GPX (GPS tracks). Not in the default set: audio, because copyrighted music is a DMCA magnet — an admin can add it in config with eyes open. Denied outright: executables, scripts, HTML, SVG, archives, macro-enabled Office. The server checks magic bytes, not extensions. Non-image files are served as downloads from the storage domain, never inline on the site origin. Per-file and per-account byte caps by trust level, admin unlimited. Denylist rejected (always misses something new). Fixed list rejected (a maker or hiking crowd wants STL or GPX without a release).
- 2026-09-11 — **D9 Reactions: a small fixed emoji set, counts on the item only.** No totals on profiles, no sorting by reactions. Single like rejected (less fun). None rejected (quiet members lose a way to say "I saw this").
- 2026-09-11 — **D10 Thread depth: cap at 6.** Deeper replies attach at level 6 and mention who they answer. Cap at 3 rejected (long talks get awkward). Unlimited rejected (slivers on mobile, where arguments live).
- 2026-09-11 — **D11 URL shape: `/@handle/slug`.** Author page is `/@handle`. Anonymous posts live at `/p/slug` and redirect (301) to `/@handle/slug` once claimed. Erased authors' URLs return 410 Gone. Reserved handles: `anon`, `p`, `admin`, `mod`, and every top-level route. `/p/slug` for all rejected (says nothing about the author). Dated URLs rejected (stale in search).
- 2026-09-11 — **D18 Sharing: public and unlisted visibility, a preview card the author can shape.** Unlisted posts open by link but stay out of feeds, tag pages, sitemap, RSS and search (`noindex`). Every post gets OpenGraph and Twitter tags plus a generated preview image (cover image if set, else a branded card with title and author). The author can pick the cover image and write a one-line summary for the card, else the first sentence is used. No off switch: a shared link always previews. Share button copies the link and opens the native share sheet on mobile. Members-only tier rejected (crawlers cannot preview it, splits SEO). Preview off switch rejected (a bare card looks broken, not private).

## Not yet specified (the frontier)

Tags: `[grilling]` = talk it through · `[prototype]` = design canvas · `[research]` = look it up · `[task]` = manual work.

- [ ] **D4b** Video storage for phase 2: Cloudflare R2 (S3 API, zero egress), or Supabase Pro? `[grilling]`
      Research is done (see D4). Decide when video upload is next on the list. Blocks: phase 2 video, nothing in phase 1.
- [ ] **D17** Illegal and violent content: what scans, what gets blocked before a human sees it, and what gets reported? `[research]` then `[grilling]`
      Josh's requirement: protections against CSAM, violent content, and similar, planned from the start. Draft plan to research and confirm:
      (a) **CSAM hash matching before any human sees an upload.** Candidates: Cloudflare's CSAM Scanning Tool (free for sites behind Cloudflare, fuzzy hash, reports to NCMEC), Microsoft PhotoDNA (application required), Thorn Safer (paid). A match blocks the upload, preserves evidence, files the report, and never reaches the queue.
      (b) **Classifier hold for violence, gore, and sexual content.** Image: AWS Rekognition moderation, Google Vision SafeSearch, Sightengine, or Hive. Text: a moderation API or a Claude classifier. A hit sets a `flag` on the queue item and blurs it by default. Never auto-publishes, never auto-deletes except (a).
      (c) **Site policy.** Porch is for fun things. Recommendation: no gore, no sexual content, at all, with a content-warning tag for legal-but-heavy topics. Confirm.
      (d) **Legal duties (US).** Provider reporting to NCMEC CyberTipline, evidence preservation window, a law-enforcement contact path, and an "illegal content" report reason separate from normal reports. Verify current statute details in research.
      (e) **Moderator wellbeing.** Blur by default, reveal on click, one-click escalation, and a written procedure so no one is surprised.
      Blocks: MediaManager upload flow, ModerationPolicyEngine, the queue UI, terms page.
- [ ] **D12** Name and visual identity. `[prototype]`
      Josh likes "Porch". The official name is a riff on it. Includes the anonymous placeholder avatar (D13). Mock the six main screens on a design canvas: home feed, post page, editor, profile, moderation queue, account settings.

## Out of scope

- Video transcoding. Uploads are size-capped MP4 or WebM, served as-is.
- ActivityPub federation. Revisit only if the community asks.
- Karma, downvotes, and leaderboards. Ruled out on purpose. (Anonymous posting is allowed, but gated by admin approval — see D7.)
- A separate backend service. The iDesign layers live in `packages/core`, called from Next.js.
- Realtime and presence features in phase 1. The door stays open (see D2), but nothing is designed for them yet.
