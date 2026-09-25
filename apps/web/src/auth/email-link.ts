// The emailed sign-in link (#67). Its template sends the browser to
// `/auth/confirm?token_hash=…&type=email`. That page only shows a button: the token is
// spent when the person presses it, never on the GET. Mail scanners open links on their
// own, and a GET that spent the token would leave the person a dead link. The hash, not
// a PKCE code, is what lets the link open in any browser.
//
// `type` comes off a URL anyone can edit, so it is checked against the one value the
// templates in `supabase/templates/` write. Supabase's own sample casts it, which would
// pass an attacker's choice (`recovery`, `email_change`) to `verifyOtp`.
export const EMAIL_LINK_TYPE = "email";

export function isEmailLinkType(value: string | null): value is typeof EMAIL_LINK_TYPE {
  return value === EMAIL_LINK_TYPE;
}

export const EMAIL_LINK_PATH = "/auth/confirm";

// The page to land on after the link. The email template cannot carry it (the link is
// built from the Site URL alone, so a redirect Supabase does not recognise can never
// break it), so the sign-in action keeps it in this cookie. A link opened in another
// browser has no cookie and lands on the home page.
export const SIGN_IN_NEXT_COOKIE = "porchlight-sign-in-next";

// As long as the link lives: `otp_expiry` in supabase/config.toml.
export const SIGN_IN_NEXT_MAX_AGE_SECONDS = 60 * 60;
