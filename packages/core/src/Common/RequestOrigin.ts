// Where a signed-in write came from, as the Client saw the request (SPEC.md §7): the
// address (the untrusted placeholder when there is no trusted proxy) and the agent. An
// anonymous write carries the same two in its AnonymousSubmission.
export interface RequestOrigin {
  readonly clientIp: string;
  readonly userAgent: string | undefined;
}
