# Social share buttons (idea)

Logged 2026-10-09. Not decided. Open question **D34** in [WAYFINDER.md](WAYFINDER.md).

## The idea

A post page shows a row of buttons, one for each social site. A reader clicks "Bluesky" and gets a new Bluesky post with the link and title in it.

## What exists today

- D18 and SPEC.md section 9 give each post one share button. It copies the link and opens the phone's own share sheet (`navigator.share`). Refer to `apps/web/src/components/ShareButton.tsx`.
- Every post already has OpenGraph and Twitter tags and a generated preview image. So a link that a reader pastes anywhere shows a good card. The new buttons need no new preview work.

## Points to decide

1. **No third-party scripts.** The official "Like" and "Share" widgets load scripts that track readers on every page view. That goes against the promise that members own their content. Plain links do the same job with no script: each site has a "compose" URL that takes the link and title as parameters. Recommendation: plain links only.
2. **Which sites.** Candidates: Bluesky, Mastodon, Threads, X, Facebook, LinkedIn, Reddit, Hacker News, and email (`mailto:`). Recommendation: the admin picks the set in `site_config` on `/admin`, with a short default list.
3. **Mastodon needs a server name.** Mastodon has no single site, so the button must ask the reader for their server once. The browser can keep that answer in local storage.
4. **Which posts show the buttons.** Public posts, yes. Unlisted posts open by link, so buttons there are fine, but they push an unlisted link out to the world. Private posts (D27), never. Pending or hidden posts, never.
5. **Phones.** The phone share sheet already lists every app the reader has. On a phone, the buttons may only add noise. One option: show the buttons on desktop, and the one share-sheet button on a phone.
6. **Counts.** Share counts need the sites' APIs and look like a score. D9 keeps totals off profiles and out of sorting. Recommendation: no counts.

## Standing constraints that apply

- A Playwright test for the button row (each link has the correct URL and parameters).
- No vendor keys, because compose links need none. No setup guide is necessary.
