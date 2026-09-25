# Google OAuth

Google is the one way a member signs in to Porchlight (SPEC.md §4). There are no
passwords. Supabase Auth talks to Google, so the app never holds a Google secret. This
guide sets it up for a hosted project and, if you want it, for the local stack.

## What you do not need it for

Local work and the Playwright suite sign in through the dev sign-in page,
`/auth/dev-sign-in`, as one of the seeded members (`supabase.md`, password
`porchlight`). It is on when `AUTH_DEV_SIGN_IN=on` in `apps/web/.env.local`, which is the
`.env.example` default. A production build ignores the flag and answers 404. The page
mints a normal Supabase session, so RLS and the notification bell behave the same as
after a Google sign-in.

## Get the credentials

1. Open https://console.cloud.google.com/apis/credentials and pick or create a project.
2. Configure the OAuth consent screen once: an app name, a support email, and the
   `email`, `profile` and `openid` scopes. Publish it, or the sign-in works only for
   the test users you list.
3. Create an OAuth client id of type **Web application**.
4. Add the authorized redirect URI. This is Supabase Auth's callback, not the site:
   - Hosted: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Local: `http://127.0.0.1:58321/auth/v1/callback`
5. Copy the client id and the client secret.

## Where the values go

**Hosted.** In the Supabase dashboard, open Authentication, Providers, Google. Paste the
client id and secret and save. Then, under Authentication, URL Configuration, set the
site URL to the deployment's origin and add `<origin>/auth/callback` to the redirect
allow list. The app reads the same origin from `NEXT_PUBLIC_SITE_URL`.

**Local.** `supabase/config.toml` has Google enabled and reads the two values from the
environment. Put them in `supabase/.env.local` (ignored by git), then restart the stack:

```sh
printf 'SUPABASE_AUTH_GOOGLE_CLIENT_ID=%s\nSUPABASE_AUTH_GOOGLE_SECRET=%s\n' \
  '<client id>' '<client secret>' > supabase/.env.local
supabase stop && supabase start
```

With the values unset the stack still starts. The Google button then fails at Google's
side and the dev sign-in page still works.

To check the real flow end to end, run `pnpm test:e2e:headed` with the values set. It
opens a visible browser at the site, clicks the Google button, and waits up to three
minutes for you to sign in at Google. Then it checks that the session shows and that
sign-out ends it. CI never runs this test. Every other part of sign-in has a headless
test in `apps/web/e2e/auth.spec.ts`.

## What happens on sign-in

1. The "Sign in with Google" button posts to a Server Function, which asks Supabase Auth
   for Google's URL and redirects the browser there.
2. Google sends the browser to Supabase Auth's callback, which sends it to
   `/auth/callback` on the site with a one-time code.
3. `/auth/callback` exchanges the code for a session (cookies) and runs the
   `AccountManager` `EnsureProfile` request.
4. On the first sign-in `EnsureProfile` creates the `profiles` row: role `member`,
   trust `probation`, and a handle derived from the email's local part (`marisol.vega`
   becomes `marisol-vega`, then `-2`, `-3`, ... if taken). The email in
   `PORCHLIGHT_ADMIN_EMAIL` becomes `admin` and `trusted`. When that variable is empty,
   the first profile ever becomes admin instead.
5. The member lands on the page they started from. `/settings` edits the display name,
   the handle and the bio.

`apps/web/src/proxy.ts` refreshes the session cookie on every request, so a page never
sees an expired token.

## Production checklist

- Keep the Email provider on for the sign-in links, with **Confirm email** on
  ([email-sign-in.md](email-sign-in.md)). An unconfirmed email sign-up with the
  `PORCHLIGHT_ADMIN_EMAIL` address would otherwise become admin.
- Do not set `AUTH_DEV_SIGN_IN=on` in a production environment. The build refuses it,
  but the setting should not be there.
- Set `PORCHLIGHT_ADMIN_EMAIL` before you deploy. Then only that account becomes admin,
  even when a stranger signs in first. Without it, whoever signs in first is admin.
