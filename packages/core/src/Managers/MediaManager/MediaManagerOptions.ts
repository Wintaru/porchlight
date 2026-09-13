// What the composition root pins on every handler that touches storage (SPEC.md §6,
// D4): the quarantine bucket's name, so a self-hoster can rename it without a code
// change. `ipHashSalt` is the same salt AnonymousGuardOptions carries (SPEC.md §7): one
// salt for the whole deployment, reused rather than a second `*_SALT` variable for the
// same idea.
export interface MediaManagerOptions {
  readonly quarantineBucket: string;
  readonly ipHashSalt: string;
}
