// The fake's `tags` table: each tag's description by slug. A tag is there once a test
// stores a description for it. `failing` makes every call answer TagAccessFailedResponse.
export class FakeTagState {
  readonly descriptions = new Map<string, string | null>();

  constructor(readonly failing = false) {}
}
