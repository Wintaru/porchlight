import type { RequestContext } from "./RequestContext";

// Base of every request in every layer. The resolver dispatches on the concrete class, so
// a request needs no discriminant field: the class is its name. The id and clock default
// here because the Client can only import the core entry and Common cannot import
// Utilities, which leaves this the one place both sides can reach. Web Crypto, not
// node:crypto, so Common stays runtime-neutral.
export abstract class RequestBase {
  readonly correlationId: string;
  readonly timestamp: Date;

  constructor(context: RequestContext = {}) {
    this.correlationId = context.correlationId ?? globalThis.crypto.randomUUID();
    this.timestamp = context.timestamp ?? new Date();
  }
}
