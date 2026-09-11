import { ResponseBase } from "./ResponseBase";

// Returned by a resolver that has no handler for the request's class. This is a wiring
// bug at the composition root, not a user error, so the Client maps it to a 500.
// `requestType` is the class name and may be mangled in a minified build. It is a
// diagnostic string only; dispatch itself keys on the class, not the name.
export class UnhandledRequestResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly requestType: string,
  ) {
    super(correlationId);
  }
}
