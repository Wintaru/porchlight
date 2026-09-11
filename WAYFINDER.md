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

## Not yet specified (the frontier)

Tags: `[grilling]` = talk it through · `[prototype]` = design canvas · `[research]` = look it up · `[task]` = manual work.

- [ ] **D4b** Video storage for phase 2: Cloudflare R2 (S3 API, zero egress), or Supabase Pro? `[grilling]`
      Research is done (see D4). Decide when video upload is next on the list. Blocks: phase 2 video, nothing in phase 1.
- [ ] **D7** Membership: open, invite-only, or approve-new-members? `[grilling]`
      Recommendation: ship the switch, default to approve. Blocks: sign-up flow, PermissionEngine.
- [ ] **D9** Reactions: none, likes only, or emoji reactions? `[grilling]`
      Recommendation: emoji reactions with counts on posts, never on profiles. Blocks: post schema, post page.
- [ ] **D10** Comment threading depth: unlimited, or capped? `[grilling]`
      Recommendation: cap at 6. Blocks: comment schema, comment UI.
- [ ] **D11** Post URL shape: `/p/slug`, `/@handle/slug`, or `/yyyy/mm/slug`? `[grilling]`
      Recommendation: `/@handle/slug`. Blocks: routing, sitemap, canonical URLs.
- [ ] **D12** Name and visual identity. `[prototype]`
      Mock the six main screens on a design canvas: home feed, post page, editor, profile, moderation queue, account settings.

## Out of scope

- Video transcoding. Uploads are size-capped MP4 or WebM, served as-is.
- ActivityPub federation. Revisit only if the community asks.
- Karma, downvotes, leaderboards, and anonymous accounts. Ruled out on purpose.
- A separate backend service. The iDesign layers live in `packages/core`, called from Next.js.
- Realtime and presence features in phase 1. The door stays open (see D2), but nothing is designed for them yet.
