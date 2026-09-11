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

## Not yet specified (the frontier)

Tags: `[grilling]` = talk it through · `[prototype]` = design canvas · `[research]` = look it up · `[task]` = manual work.

- [ ] **D4b** Video storage for phase 2: Cloudflare R2 (S3 API, zero egress), or Supabase Pro? `[grilling]`
      Research is done (see D4). Decide when video upload is next on the list. Blocks: phase 2 video, nothing in phase 1.
- [ ] **D13** Notification events: which events notify whom? `[grilling]`
      Draft matrix to confirm: new item in the approval queue → admins and moderators. Reply to your post or comment → author. Your item approved or rejected → author (members only). Report filed → moderators. Mod action on your content → author. Blocks: notifications table, ModerationManager, CommentManager.
- [ ] **D14** Notification channels: in-app only, email, or both, and immediate or digest? `[grilling]`
      Recommendation: in-app first through a `notifications` table with Supabase realtime for the bell, email in phase 2 through one `EmailAccessor`. Blocks: D13 delivery, phase 2 email vendor.
- [ ] **D15** Anonymous abuse guards: which ones ship in phase 1? `[grilling]`
      Candidates: Turnstile on anonymous submit, rate limit per IP and per anonymous token, no media for anonymous, link-free until approved, admin block of an anonymous token or IP hash. Blocks: the anonymous submit path.
- [ ] **D9** Reactions: none, likes only, or emoji reactions? `[grilling]`
      Recommendation: emoji reactions with counts on posts, never on profiles. Blocks: post schema, post page.
- [ ] **D10** Comment threading depth: unlimited, or capped? `[grilling]`
      Recommendation: cap at 6. Blocks: comment schema, comment UI.
- [ ] **D11** Post URL shape: `/p/slug`, `/@handle/slug`, or `/yyyy/mm/slug`? `[grilling]`
      Recommendation: `/@handle/slug`. Blocks: routing, sitemap, canonical URLs.
- [ ] **D12** Name and visual identity. `[prototype]`
      Josh likes "Porch". The official name is a riff on it. Mock the six main screens on a design canvas: home feed, post page, editor, profile, moderation queue, account settings.

## Out of scope

- Video transcoding. Uploads are size-capped MP4 or WebM, served as-is.
- ActivityPub federation. Revisit only if the community asks.
- Karma, downvotes, and leaderboards. Ruled out on purpose. (Anonymous posting is allowed, but gated by admin approval — see D7.)
- A separate backend service. The iDesign layers live in `packages/core`, called from Next.js.
- Realtime and presence features in phase 1. The door stays open (see D2), but nothing is designed for them yet.
