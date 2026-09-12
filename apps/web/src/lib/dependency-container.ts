import { DependencyContainer } from "@porchlight/core";

// The Client's container. Route handlers and Server Functions reach every Manager
// through it. Import it only from server code: the container reads the server
// environment and wires accessors that must never run in a browser.
//
// Built on the first call, not at import: `next build` imports every route module to
// collect its configuration, and a missing key must fail the first request, not the
// build. `next dev` may give separate route files separate module instances, so
// in-memory fake state is only shared inside one route file.
let container: DependencyContainer | undefined;

export function getDependencyContainer(): DependencyContainer {
  container ??= new DependencyContainer(process.env);
  return container;
}
