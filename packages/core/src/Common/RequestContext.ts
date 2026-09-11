// What a caller may pin on a request instead of taking the defaults. A Manager handler
// passes `{ correlationId: request.correlationId }` when it builds the Accessor request,
// so one id follows the whole call. Tests pass both fields for a deterministic request.
export interface RequestContext {
  readonly correlationId?: string;
  readonly timestamp?: Date;
}
