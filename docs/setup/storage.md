# Storage buckets

Every upload lands in a private quarantine bucket in Supabase Storage before anything
else happens to it — scanning, moderation, or a place in a published post (SPEC.md §6,
§7, D4). This guide covers the two buckets and what "local with no vendor keys" means
here: there is nothing to sign up for, since Supabase Storage is part of the same local
stack `supabase start` already runs.

## The two buckets

- **`quarantine`** — private. Every original upload lives here until #10's scan
  pipeline and #11's approval queue clear it. `MediaAssetAccessor`'s own RLS policies
  let a member read their own row's metadata, never a locked one, and never the object
  itself directly (SPEC.md §7).
- **`public-media`** — public. Where an approved file's public copy goes: a re-encoded
  image, a video copied as it is, or any other file as a download.

Both are created by `supabase/migrations/20260912215700_storage_buckets.sql`, which
runs the same way every other migration does (`supabase db reset` locally, or the
platform's own migration step in production). `20260927070000_video_uploads.sql` sets
each bucket's limit to 500 MiB for video.

**Video needs the Pro plan.** The free plan takes files of 50 MB at most and 1 GB in
total. On Pro, open Storage, Settings in the dashboard and set "Upload file size limit"
to at least 500 MB: that project-wide limit applies before the bucket's own.

## What you do not need for local work

`MEDIA_PROVIDER`, `MEDIA_STORAGE_PROVIDER` and `QUOTA_PROVIDER` default to `supabase`
and read straight from the local stack `supabase start` already provides —
`STORAGE_BUCKET_QUARANTINE` and `STORAGE_BUCKET_PUBLIC` in `.env.example` already name
the two buckets above. Setting any of the three `*_PROVIDER` variables to `fake`
selects an in-memory store instead, for `packages/core`'s own tests; each fake has a
`*_FAKE_RESULT` of `ok | fail`, the same knob every other accessor's fake carries
(D19). Playwright runs against the real local stack, not the fakes.

## The allowlist and the two quotas

Both live in `site_config`, not in `.env.example`: they are admin-editable data, not
deployment secrets.

- `attachment_allowlist` — the file extensions an upload may claim. Default set:
  png, jpeg, gif, webp, avif, heic, mp4, pdf, docx, xlsx, pptx, odt, ods, odp, txt, md,
  csv, stl, gpx (D16, D4b). An admin can narrow or widen this list once #12's settings page exists,
  but only to extensions the server already knows the magic bytes and kind for
  (`Common/AttachmentTypeCatalog.ts`) — adding a wholly new file type needs a code
  change, not a config edit.
- `attachment_quota_by_trust` — per-file, per-account and per-video byte caps for each
  trust level (probation, trusted). By default probation uploads no video, and a
  trusted member uploads videos up to 250 MiB in an account of 2 GiB. An admin has no
  quota (D16).
- `anonymous_upload_cap` — the D15 fixed cap for a visitor's own upload: 3 files, 2 MB
  each. Not trust-level based, since an anonymous author has no trust level.

A missing key in any of the three answers the default above, the same "absent means the
default" rule `site_config.posting` and `site_config.comments` already follow.

## What happens on upload

1. The editor asks `MediaManager` for a signed upload URL. The allowlist and the
   quota are checked against the claimed file name and its declared size before
   anything is signed — a member who is already over quota, or picks a disallowed
   extension, never gets a URL.
2. The browser puts the file straight to that signed URL — Supabase Storage's own
   `uploadToSignedUrl`, never through Porchlight's own servers.
3. The editor confirms the upload. `FinalizeUploadHandler` downloads what is actually
   sitting in quarantine, checks its real magic bytes against the claimed extension
   (never the extension alone — an SVG renamed to `.png` fails here), computes its
   SHA-256, and only then writes the `media_assets` row and counts it against quota.
4. Every non-image kind is served with `Content-Disposition: attachment` — Supabase
   Storage's own `download` option on a signed URL, not a proxy route of Porchlight's
   own — so a PDF downloads instead of rendering inline, from the storage origin, never
   the site origin (SPEC.md §6).

## Photos from an iPhone (HEIC)

An iPhone saves photos as HEIC, which few browsers show. Safari usually converts a photo
to JPEG as it uploads it, but a HEIC file still arrives from a Mac, a file app or some
Android phones. The server decodes it with `heic-decode` (libheif as WebAssembly: the
standard `sharp` build leaves HEIC out for patent reasons) and publishes an AVIF copy.
The scanners get a JPEG of the same pixels, at full size. One upload decodes the file
once: the JPEG and the AVIF copy start from the same pixels. The quarantine keeps the
HEIC file. HEVC patents cover the decoder; a self-hoster in a strict jurisdiction can
untick `heic` in the allowlist.

## Video (D4b)

The server never converts video. The editor converts it in the member's browser first
(Mediabunny, with the browser's own video hardware): H.264 MP4 of at most 1080p with
AAC sound, the movie box first, and no metadata such as a location. Then it uploads.

`FinalizeUploadHandler` never reads a video whole. It reads the first 64 KiB (the type
and where the movie box is), then the movie box, and refuses a file with metadata, a
codec other than H.264 and AAC, or its movie box after the media
(`video-not-prepared`). Only then does it hash the whole file as a stream and give the
scanners a signed link. All of its own reads go through one short-lived signed link. The
scanners get a second, separate link, so the link that goes to an outside service is
used for nothing else. The public copy is a storage copy of the checked file.

An agent that uploads a video through `request_upload` must send a file in that same
shape, with the `video/mp4` type.

## Video links

A YouTube, Vimeo or Imgur video link alone on its line renders as a player. YouTube and
Vimeo show a card first, and the page asks the service for nothing until the reader
presses it; then it loads `youtube-nocookie.com` or Vimeo with "do not track". An Imgur
video plays in the browser's own player. A link inside a sentence stays a link. The
site does not scan a linked video: it stays on that service, under its rules. A post
saved before this change shows the card after **Re-render** on `/admin`.
