// Public entry of @porchlight/core. Next.js (the Client) imports Managers and their
// Request/Response types from here and nowhere else. Layer folders:
//
//   Common/       shared bases and the handler resolver
//   Composition/  the composition root that wires every handler once
//   Managers/     one folder per Manager, each with Requests/, Responses/, Handlers/
//   Engines/      pure business rules
//   Accessors/    I/O boundaries, each with a fake mode
//   Utilities/    logger, ids and clock, markdown parser and sanitizer
//
// Issue #2 fills these in. The folders exist now so the boundary lint has elements to fence.
export {};
