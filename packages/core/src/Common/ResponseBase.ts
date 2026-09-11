// Base of every response. It carries only the correlation id of the request it answers.
// Success and failure are separate response classes, not a flag plus an optional message,
// so a caller narrows with `instanceof` and never reads a field that is not there.
export abstract class ResponseBase {
  constructor(readonly correlationId: string) {}
}
