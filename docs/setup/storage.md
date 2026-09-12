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
- **`public-media`** — public. Where #10/#11 later copy an approved, re-encoded file.
  This issue creates the bucket but never writes to it: nothing #9 builds gets far
  enough in the pipeline to publish, since scanning (#10) does not exist yet.

Both are created by `supabase/migrations/20260912215700_storage_buckets.sql`, which
runs the same way every other migration does (`supabase db reset` locally, or the
platform's own migration step in production). There is no dashboard step.

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
  png, jpeg, gif, webp, avif, pdf, docx, xlsx, pptx, odt, ods, odp, txt, md, csv, stl,
  gpx (D16). An admin can narrow or widen this list once #12's settings page exists,
  but only to extensions the server already knows the magic bytes and kind for
  (`Common/AttachmentTypeCatalog.ts`) — adding a wholly new file type needs a code
  change, not a config edit.
- `attachment_quota_by_trust` — per-file and per-account byte caps, one pair per trust
  level (probation, trusted). An admin has no quota (D16).
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

## Not built here

Scanning (#10), the moderation queue's "approve" action moving a file into the public
bucket (#11), and video (#21) are separate issues. A file this issue creates stays in
quarantine, `scan_status = 'pending'`, until one of those exists.
