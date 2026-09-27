# Email

Porchlight sends email through one `EmailAccessor` (SPEC.md §8, WAYFINDER D14, issue
#22). This is the site's own mail. The sign-in links are Supabase Auth's mail and have
their own guide, [email-sign-in.md](email-sign-in.md).

## What it is for

- **Digests.** A member picks hourly or daily in Settings. Unread bell notifications are
  bundled into one message. The in-app bell stays immediate.
- **The moderation queue.** An admin or moderator can ask for an email as soon as an
  item waits for review.
- **Reader subscriptions.** A reader with no account subscribes by email to the whole
  site (the form on the home page) or to one author (the form on their page). The
  first email asks them to confirm, and nothing else is sent until they do. After
  that, new public posts arrive on the schedule they picked. The form uses Turnstile
  ([turnstile.md](turnstile.md)) and allows five tries an hour for one address.

There is no email for every event. D14 rejected that as too noisy.

## Providers

`EMAIL_PROVIDER` takes one of three values.

| Value    | What happens                                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`   | The default when the variable is unset. The site sends no email and shows no email settings or subscribe forms.                                                                    |
| `fake`   | Local work and tests. Each subject goes to the server log. With `EMAIL_FAKE_MAILPIT_URL`, each message also goes to the local stack's mail catcher. Refused in a production build. |
| `resend` | Sends through Resend. Needs `EMAIL_API_KEY` and `EMAIL_FROM`.                                                                                                                      |

## Local

The `.env.example` values select the fake and the local mail catcher. Open
`http://127.0.0.1:58324` to read what the site sent. `EMAIL_FAKE_RESULT=fail` makes
every send fail, for the error path.

## Get the credentials

1. Create an account at https://resend.com.
2. Add the sending domain and put its DNS records (SPF and DKIM) at your DNS host. Wait
   until Resend shows the domain as verified.
3. Create an API key with the "Sending access" permission for that domain.

If Supabase Auth already sends the sign-in links through Resend, use the same verified
domain.

## Where the values go

**Hosted.** Set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY` to the key, and `EMAIL_FROM` to
an address on the verified domain, for example `Porchlight <mail@blog.example.com>`.

**Local.** Keep the `.env.example` values.

## Admin checklist

Email is not a row on the `/admin` checklist. With no provider the site sends no email.
That is a missing feature, not an unsafe fake, so it shows no red row.

## The sweep

Digests and reader emails leave the site from one route, `/api/email/digest`. The
subscription confirmation is the only email sent at once, from the subscribe form. A
scheduler calls the route every few minutes with the header
`Authorization: Bearer <CRON_SECRET>`, and each call sends what is due. An empty
`CRON_SECRET` turns the route off. [deploy.md](../deploy.md), step 10, sets up the
schedule. Locally, run it by hand:

```sh
curl -X POST -H "Authorization: Bearer local-cron-secret" http://localhost:3000/api/email/digest
```

A digest is due when its hour or day has passed since the last one and the bell holds
something unread from that time. The queue email is due when a new item waits. A
reader's email is due when its hour or day has passed and a post they follow went out.
The sweep also deletes subscriptions nobody confirmed within seven days.

Every digest and reader email has a one-click unsubscribe header and an "unsubscribe"
link. The confirmation email has neither, since there is nothing to stop yet. The link
opens a page with a button, so a mail scanner that opens links cannot unsubscribe
anyone.
