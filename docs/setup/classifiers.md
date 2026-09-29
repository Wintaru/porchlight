# Image classifier

The second stage of the scan pipeline (SPEC.md §7, WAYFINDER D17, after
`docs/setup/hash-matching.md`'s hash match): a purpose-built image model scoring
violence, gore, sexual content, self-harm, and minors. **A general-purpose LLM API
(Anthropic, OpenAI chat) never receives an image** — those vendors are not set up to
receive suspected illegal material, and sending it could itself be distribution. That
rule is why this is its own provider slot rather than reusing a text model.

## What you do not need it for

Local work and the Playwright suite run the fake provider: `IMAGE_CLASSIFIER_PROVIDER=fake`
(the default) answers `IMAGE_CLASSIFIER_FAKE_RESULT` — `clear`, `flagged`, `locked`, or
`fail` — instead of calling a real service. A production build refuses to start with
the fake provider.

## Get the credentials

Sightengine is the implemented provider. Hive is a reserved slot for later.

1. Create a Sightengine account. No dashboard workflow is needed: each request names
   its models (`nudity-2.1`, `violence`, `gore`, `self-harm`, `offensive`, `face-age`).
2. Sightengine authenticates with a user id and a secret. Set
   `IMAGE_CLASSIFIER_API_KEY` to `user:secret` (both values, one variable, joined with
   a colon) rather than a second variable only this provider needs.

## Where the values go

**Hosted.** Set `IMAGE_CLASSIFIER_PROVIDER=sightengine` and `IMAGE_CLASSIFIER_API_KEY`
in the deployment's environment.

**Local.** Leave `IMAGE_CLASSIFIER_PROVIDER` unset (or `fake`) in
`apps/web/.env.local`, the `.env.example` default.

## What happens on upload

1. For an image attachment, `ImageClassifierAccessor.load` answers a severity score
   and a separate minors signal. A video goes by a signed link. The Sightengine video
   scan is not built yet. With `IMAGE_CLASSIFIER_PROVIDER=sightengine`, every video
   upload fails with "try again", unless `ALLOW_FAKE_PROVIDERS=1` is set. With that
   switch, the fake answers "clear" for video, hash matching still runs, and the admin
   checklist shows the video classifier as not yet active. With
   `IMAGE_CLASSIFIER_PROVIDER=fake`, the fake answers for a video the same as for an
   image.
2. `ModerationPolicyEngine` compares the score against `site_config.moderation_thresholds`
   (defaults: flag at 0.5, lock at 0.9 — an admin may only lower these, never raise
   them, once #12 builds the editor). A minors signal always locks, regardless of the
   score. With Sightengine, the minors signal is a face scored 0.5 or more as a minor
   together with a sexual or very suggestive score of 0.2 or more. A plain photo of a
   child is not a minors signal and goes through like any other photo. Sexual content with no
   face that the model can read gives no minors signal; it still flags or locks on its
   score. Sightengine's `erotica` score counts toward severity, so any nudity is held.
3. **flagged** holds the item for a moderator: shown blurred and grayscale in the
   queue, cannot publish until reviewed. **locked** freezes it the same way a hash
   match does (`docs/setup/hash-matching.md`).

## Text moderation (reserved)

`TEXT_MODERATION_PROVIDER` and `TEXT_MODERATION_API_KEY` are reserved in
`.env.example` for a future issue that classifies post and comment text (OpenAI
Moderation or Claude). No accessor reads them yet — this is the same "declared ahead
of the issue that builds it" pattern `EMAIL_PROVIDER` already follows for phase 2.

## Production checklist

- Set `IMAGE_CLASSIFIER_API_KEY` before opening uploads to anyone the site does not
  fully trust.
- Review `site_config.moderation_thresholds` against the account's actual traffic once
  #12 ships the admin page — the shipped default favors caution over false positives.
