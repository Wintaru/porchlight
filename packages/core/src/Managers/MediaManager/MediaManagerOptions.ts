// What the composition root pins on every handler that touches storage (SPEC.md §6,
// D4): the quarantine bucket's name, so a self-hoster can rename it without a code
// change.
export interface MediaManagerOptions {
  readonly quarantineBucket: string;
}
