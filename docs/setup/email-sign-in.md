# Email sign-in links

A person types an email address on `/auth/sign-in` and gets a one-time link. The link
signs them in. There is no password. Google sign-in stays beside it
([google-oauth.md](google-oauth.md)). Supabase Auth sends these emails. This is not
the phase 2 digest email in [email.md](email.md).

## Locally: nothing to do

The local stack sends every email to its mail catcher, Mailpit, at
http://127.0.0.1:58324. Open it to click a link by hand. The Playwright spec
`e2e/magic-link.spec.ts` reads the link from Mailpit. The templates in
`supabase/templates/` load when the stack starts, so run `supabase stop` and
`supabase start` after you change them.

## How it works

1. The sign-in page posts the address to a Server Function. It calls Supabase Auth
   `signInWithOtp` and puts the page to return to in a short-lived cookie.
2. Supabase Auth sends the email from the template. The link is
   `<Site URL>/auth/confirm?token_hash=…&type=email`. A new address gets the Confirm
   signup template, and an address with an account gets the Magic Link template.
3. `/auth/confirm` shows one button, "Finish signing in". Opening the link does
   nothing, so a mail scanner that opens it first does not use it up.
4. The button redeems the hash with `verifyOtp` and creates the profile on the first
   visit. The `sign_up` setting and `PORCHLIGHT_ADMIN_EMAIL` apply the same as for
   Google. The name and picture stay empty: the member sets the name on `/settings`.
5. The link works once and for one hour. A used or expired link goes to
   `/auth/sign-in-failed?reason=link`, which says to ask for a new one.

The link opens in any browser, also a private window. A link opened in a browser that
did not ask for it lands on the home page, because the return-page cookie is not
there.

## Production

The built-in Supabase sender is for tests only. It sends a few emails each hour, and
the sender name is "Supabase Auth". Connect your own sender before launch.

### 1. A sending domain

Resend is the suggested provider. Its free tier is 3,000 emails each month.

1. Make an account at https://resend.com, or use one you have.
2. Go to Domains, Add Domain. Add the site's domain.
3. Add the DNS records that Resend shows (MX, SPF and DKIM) where the domain is
   registered. Always copy the values that Resend shows.
4. Wait until Resend marks the domain Verified. Then make an API key with the
   "Sending access" permission.

### 2. Custom SMTP in Supabase

Project Settings, Authentication, SMTP Settings. Turn on Enable Custom SMTP and enter:

| Field        | Value                                   |
| ------------ | --------------------------------------- |
| Host         | `smtp.resend.com`                       |
| Port         | `465`                                   |
| Username     | `resend`                                |
| Password     | The Resend API key                      |
| Sender email | An address on the verified domain       |
| Sender name  | The site name                           |

Then open Authentication, Rate Limits and set the emails-per-hour limit. Start low,
for example 30. The limit stops a stranger from using the form to send many emails.

### 3. The templates

A hosted project ignores `supabase/templates/`. Open Authentication, Emails and paste
each file's whole contents into its template:

| Template       | File                                   | Subject              |
| -------------- | -------------------------------------- | -------------------- |
| Magic Link     | `supabase/templates/magic_link.html`   | Your sign-in link    |
| Confirm signup | `supabase/templates/confirmation.html` | Confirm your email   |

Paste them again when the files change. `supabase config push` is not a safe way to
send them: it also overwrites the Site URL and the redirect list with local values.

### 4. Auth settings

- Authentication, URL Configuration: the Site URL must be the site's origin, the same
  as `NEXT_PUBLIC_SITE_URL`, with no trailing slash. The link is built from it.
- Authentication, Providers, Email: keep the provider on, and keep **Confirm email**
  on. With it off, a stranger could make an account for your address with a password
  through the Auth API and sign in at once. For the `PORCHLIGHT_ADMIN_EMAIL` address,
  that is the admin account.
- Keep **Allow new users to sign up** on (Authentication, Sign In / Providers). The
  `sign_up` setting on `/admin` decides who may join. With the switch off, the form
  still says "Check your email" to every address, so it does not show who is a member,
  but a new address gets no email.

Confirm email alone does not stop a password that a stranger set before you confirmed
the address. The migration `20260925220000_clear_password_on_email_confirm` does that:
when an address is confirmed, any password on the account is removed.

### 5. Check it

1. Sign out, ask for a link on `/auth/sign-in`, follow it, and press "Finish signing
   in".
2. Open the same link again and press the button. It must show "This sign-in link has
   expired or was used already".
3. Ask for a link for an address that has never signed in. It must get the Confirm
   signup email, and the link must sign it in.
