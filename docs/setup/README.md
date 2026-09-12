# Setup guides

One guide per external service. Each says what the service is for, how to get
credentials, where they go in `.env.example`, and what the fake mode does without it.
The admin duty checklist links the same guides.

| Guide                               | Service                                  | Variables                             |
| ----------------------------------- | ---------------------------------------- | ------------------------------------- |
| [`supabase.md`](supabase.md)        | Postgres, Auth, Storage, Realtime        | `*_SUPABASE_*`, `DATABASE_URL`        |
| [`google-oauth.md`](google-oauth.md) | Sign-in through Supabase Auth            | `SUPABASE_AUTH_GOOGLE_*`, `AUTH_DEV_SIGN_IN`, `PORCHLIGHT_ADMIN_EMAIL` |
| `turnstile.md` (issue #18)          | Bot check on anonymous submits           | `*_TURNSTILE_*`                       |
| `storage.md` (issue #18)            | Upload buckets                           | `STORAGE_BUCKET_*`                    |
| `hash-matching.md` (issue #18)      | Known-illegal image fingerprints         | `HASH_MATCH_*`                        |
| `classifiers.md` (issue #18)        | Image classifier and text moderation     | `IMAGE_CLASSIFIER_*`, `TEXT_MODERATION_*` |
| `email.md` (issue #18, phase 2)     | Digest email                             | `EMAIL_*`                             |

Research that fed the decisions lives in [../research/](../research/).
