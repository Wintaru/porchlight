// The fake's "table": running usage by profile id. `failing` makes every call answer
// QuotaAccessFailedResponse, for the error path.
export class FakeQuotaState {
  readonly usage = new Map<string, { bytesUsed: number; filesCount: number }>();

  constructor(readonly failing = false) {}
}
