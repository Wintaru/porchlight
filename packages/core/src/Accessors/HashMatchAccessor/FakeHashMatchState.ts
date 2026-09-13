// clear | match | fail (.env.example): the same three-value vocabulary
// HASH_MATCH_FAKE_RESULT documents, so the composition root and a test both read the
// same words. "fail" answers HashMatchAccessFailedResponse, for the error path.
export const FAKE_HASH_MATCH_RESULTS = ["clear", "match", "fail"] as const;

export type FakeHashMatchResult = (typeof FAKE_HASH_MATCH_RESULTS)[number];

export class FakeHashMatchState {
  constructor(readonly result: FakeHashMatchResult = "clear") {}
}
