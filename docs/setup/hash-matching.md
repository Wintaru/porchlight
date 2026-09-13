# Hash matching

Every image upload is checked against known-illegal fingerprints before it can be
approved (SPEC.md §7, WAYFINDER D17). This is the first stage of the scan pipeline
`MediaManager`'s finalize handlers run: hash match, then the image classifier
(`docs/setup/classifiers.md`). Scanning cannot be turned off.

## What you do not need it for

Local work and the Playwright suite run the fake provider: `HASH_MATCH_PROVIDER=fake`
(the default) answers `HASH_MATCH_FAKE_RESULT` — `clear`, `match`, or `fail` — instead
of calling a real service. A production build refuses to start with the fake provider.

## Get the credentials

Project Arachnid's Shield is the approved default (WAYFINDER D17b). PhotoDNA and
Cloudflare's own tool are reserved provider slots for later — `HASH_MATCH_PROVIDER`
will accept them once they are built.

1. Apply for Shield access through Project Arachnid. Access is vetted; it is not a
   self-serve signup.
2. Once approved, the API key goes in `HASH_MATCH_API_KEY`.

## Where the values go

**Hosted.** Set `HASH_MATCH_PROVIDER=arachnid-shield` and `HASH_MATCH_API_KEY` in the
deployment's environment.

**Local.** Leave `HASH_MATCH_PROVIDER` unset (or `fake`) in `apps/web/.env.local`, the
`.env.example` default.

## What happens on upload

1. `FinalizeUploadHandler` (or its anonymous mirror) downloads the real bytes from
   quarantine and sniffs them, exactly as SPEC.md §6 already required.
2. For an image, the bytes go to `HashMatchAccessor.load`, then to the image classifier.
   A non-image attachment (PDF, text, markdown, and so on) has nothing visual to match
   and skips both stages.
3. `ModerationPolicyEngine` turns a match into a **locked** verdict: frozen, hashed,
   audit-logged, retained for at least a year, and refused with no detail beyond
   "refused" (SPEC.md §7) — an uploader can never tell a hash match from any other
   refusal.

## Production checklist

- Set `HASH_MATCH_API_KEY` before opening uploads to anyone the site does not fully
  trust (`site_config.posting` or the attachment allowlist matters more than this
  alone — a hash match only ever catches what is already fingerprinted elsewhere).
- Confirm `EVIDENCE_IP_HASH_SALT` is set (`docs/setup/turnstile.md`): the evidence
  envelope a locked item freezes uses the same salt.
