# Wayfinder — Porch (working name)

Created 2026-09-11. Backend: markdown (no git remote yet). One decision per session.
See [PROPOSAL.md](PROPOSAL.md) for the full sketch and the reasoning behind each recommendation.

## Destination

A safe, searchable, open-source community blog with iDesign server layers, ready to scaffold.
Members share posts and comment. No karma, no downvotes, no leaderboards. Public pages that
search engines index. One-click erasure for any member. Admin and moderator controls that make
it a safe place.

## Decisions so far

- 2026-09-11 — **D0 Product shape: a porch, not a forum.** A blog with many authors and threaded comments. Feeds sort by time, not by votes. Josh confirmed the framing.
- 2026-09-11 — **D8 License: MIT.** Josh picked maximum adoption over copyleft. AGPL-3.0 rejected.
- 2026-09-11 — **D1 Framework: Next.js App Router.** Server rendering and SEO APIs built in, Supabase SSR docs, largest contributor pool. React Router v7 and Astro rejected.
- 2026-09-11 — **D2 Data access: hybrid.** Every write goes through a Manager. Public reads may call Supabase from the browser under RLS, but only from one `read-model` module that a lint rule fences. Realtime and presence (typing indicators, who is online) stay possible through browser channels. Not planned yet, not ruled out. Server-only rejected because it discards Supabase features out of hand.
- 2026-09-11 — **D3 Content format: markdown + cached HTML.** Markdown is the source of truth. A server engine renders sanitized HTML once on save. ProseMirror JSON rejected (not readable, ties data to Tiptap). Storing both rejected (two copies that drift).

## Not yet specified (the frontier)

Tags: `[grilling]` = talk it through · `[prototype]` = design canvas · `[research]` = look it up · `[task]` = manual work.

- [ ] **D4** Media storage: Supabase Storage, or Cloudflare R2 behind a CDN? `[research]`
      Recommendation: Supabase Storage behind one `MediaStorageAccessor`. Compare egress cost at expected volume.
- [ ] **D5** Erasure: cascade delete, or tombstone comments? `[grilling]`
      Recommendation: tombstone comments, hard-delete posts, media and profile. Blocks: comment schema, AccountManager.
- [ ] **D6** What happens to other people's comments on an erased post? `[grilling]`
      Recommendation: delete them with the post and say so in the terms. Blocks: D5 handler, terms page.
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
