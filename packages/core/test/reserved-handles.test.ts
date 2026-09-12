import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { RESERVED_HANDLES } from "../src/Engines/PermissionEngine/ReservedHandles";

// SPEC.md §5 reserves every top-level route as a handle, so `/@handle` can never shadow
// a page. The core cannot read the Client's folder tree at runtime, so this guard does:
// a folder added under apps/web/src/app without a matching entry in RESERVED_HANDLES
// fails here. Dynamic segments, route groups, parallel slots and private folders do not
// produce a top-level path of their own.
const APP_DIR = resolve(import.meta.dirname, "../../../apps/web/src/app");

function isRouteSegment(name: string): boolean {
  return !/^[[(@_]/.test(name);
}

describe("reserved handles", () => {
  test("every top-level route of apps/web is reserved", () => {
    const routes = readdirSync(APP_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isRouteSegment(entry.name))
      .map((entry) => entry.name);

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(RESERVED_HANDLES, `add "${route}" to RESERVED_HANDLES`).toContain(route);
    }
  });

  test("the four handles the spec names are reserved", () => {
    for (const handle of ["anon", "p", "admin", "mod"]) {
      expect(RESERVED_HANDLES).toContain(handle);
    }
  });
});
