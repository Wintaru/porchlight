# Setup guides

One guide per external service. Each says what the service is for, how to get
credentials, where they go in `.env.example`, and what the fake mode does without it.
The admin duty checklist links the same guides.

| Guide                               | Service                                  | Variables                             |
| ----------------------------------- | ---------------------------------------- | ------------------------------------- |
| [`supabase.md`](supabase.md)        | Postgres, Auth, Storage, Realtime        | `*_SUPABASE_*`, `DATABASE_URL`        |
| [`google-oauth.md`](google-oauth.md) | Sign-in through Supabase Auth            | `SUPABASE_AUTH_GOOGLE_*`, `AUTH_DEV_SIGN_IN`, `PORCHLIGHT_ADMIN_EMAIL` |
| [`email-sign-in.md`](email-sign-in.md) | Sign-in links by email (Supabase Auth SMTP) | None: set in the Supabase dashboard |
| [`turnstile.md`](turnstile.md)      | Bot check on anonymous submits           | `*_TURNSTILE_*`, `EVIDENCE_IP_HASH_SALT`, `ANONYMOUS_*` |
| [`storage.md`](storage.md)          | Upload buckets, allowlist and quotas     | `STORAGE_BUCKET_*`, `MEDIA_*`, `QUOTA_*` |
| [`hash-matching.md`](hash-matching.md) | Known-illegal image fingerprints      | `HASH_MATCH_*`                        |
| [`classifiers.md`](classifiers.md)  | Image classifier and text moderation     | `IMAGE_CLASSIFIER_*`, `TEXT_MODERATION_*` |
| [`email.md`](email.md) (phase 2)    | Digest email                             | `EMAIL_*`                             |

Agents have no setup guide because they need no external service: a member mints a
token in the app. [../agents.md](../agents.md) explains the door and the workflow.

The order to do these in for a hosted instance is [../deploy.md](../deploy.md).
Research that fed the decisions lives in [../research/](../research/).
