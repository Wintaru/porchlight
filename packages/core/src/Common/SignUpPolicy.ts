// Who may create a new account, from `site_config.sign_up` (D20, SPEC.md §4). `open`
// lands a new member on probation; `invite` needs an invite link (phase 2, #25) and
// today behaves like `closed`; `closed` makes `EnsureProfileHandler` refuse a first
// sign-in with a plain message. Missing from the store means `open` until #12 seeds
// the key, the same fallback every other D20 key uses.
export const SIGN_UP_POLICIES = ["open", "invite", "closed"] as const;

export type SignUpPolicy = (typeof SIGN_UP_POLICIES)[number];

export const DEFAULT_SIGN_UP_POLICY: SignUpPolicy = "open";
