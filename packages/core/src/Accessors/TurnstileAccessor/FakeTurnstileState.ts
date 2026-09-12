// The fake's one setting: TURNSTILE_FAKE_RESULT (docs/setup/turnstile.md). `pass` is
// the default so a fresh clone can submit anonymously with no keys (D19).
export class FakeTurnstileState {
  constructor(readonly passing: boolean) {}
}
