# Email (phase 2 placeholder)

Digest email through one `EmailAccessor` (SPEC.md §8, WAYFINDER D14) — issue #22 builds
it. The in-app bell is the only channel in phase 1; this guide exists early because
`.env.example` already declares the variables, the same "declared ahead of the issue
that builds it" pattern `TEXT_MODERATION_*` follows in `docs/setup/classifiers.md`.

## What it will be for

D14 keeps notifications immediate in-app and moves email to a digest: a member sets a
schedule (for example daily or weekly) and `EmailAccessor` bundles what happened since
the last send into one message, plus an immediate option reserved for the moderator
queue. There is no email-on-every-event mode — that was rejected as noisy once a porch
grows past a handful of members.

## What you do not need it for

Nothing yet. `EMAIL_PROVIDER=fake` is the only working value until #22 lands: the fake
provider writes each message to the server log instead of sending it, so local work and
the Playwright suite never need real credentials.

## Get the credentials (once #22 lands)

The reserved providers are Resend and Amazon SES — both support sending from a verified
domain without a dedicated mail server.

- **Resend.** Create an account at https://resend.com, verify the sending domain (DNS
  records: SPF, DKIM), and create an API key.
- **SES.** Verify the sending domain in the Amazon SES console, move the account out of
  the SES sandbox for production volume, and create an IAM user scoped to
  `ses:SendEmail` with an access key.

## Where the values go

**Hosted.** Set `EMAIL_PROVIDER` to `resend` or `ses`, `EMAIL_API_KEY` to the key from
above, and `EMAIL_FROM` to an address on the verified domain.

**Local.** Leave `EMAIL_PROVIDER` unset (or `fake`) in `apps/web/.env.local`, the
`.env.example` default.

## Admin checklist

Email is not one of `computeDutyChecklist`'s rows (`packages/core/src/Composition/computeDutyChecklist.ts`):
unlike hash matching, the image classifier, Turnstile and media storage, a missing
`EmailAccessor` degrades gracefully to no digests rather than to an unsafe fake running
in production, so it carries no red "not yet active" row on `/admin`. `docs/deploy.md`
step 9 covers it as a phase 2 deploy step instead.

## Not built here

`EmailAccessor`, the digest scheduler, and the member-facing schedule setting are all
issue #22. Nothing in this repo reads `EMAIL_PROVIDER` yet.
