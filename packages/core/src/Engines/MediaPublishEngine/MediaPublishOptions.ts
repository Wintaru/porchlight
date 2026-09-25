// The two buckets a publish reads from and writes to (SPEC.md §6, D4), pinned by the
// composition root from the environment so a self-hoster can rename either.
export interface MediaPublishOptions {
  readonly quarantineBucket: string;
  readonly publicBucket: string;
}
