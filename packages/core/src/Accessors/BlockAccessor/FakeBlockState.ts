// The fake's `blocks` table: two sets a test seeds directly, one per subject the D15
// list keys on.
export class FakeBlockState {
  readonly blockedAuthorIds = new Set<string>();
  readonly blockedIpHashes = new Set<string>();

  constructor(readonly failing = false) {}
}
