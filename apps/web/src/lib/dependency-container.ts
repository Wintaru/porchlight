import { DependencyContainer } from "@porchlight/core";

// The Client's container. Route handlers and server actions import this and reach every
// Manager through it. Import it only from server code: the container reads the server
// environment and wires accessors that must never run in a browser. `next dev` may give
// separate route files separate module instances, so in-memory fake state is only shared
// inside one route file.
export const dependencyContainer = new DependencyContainer(process.env);
