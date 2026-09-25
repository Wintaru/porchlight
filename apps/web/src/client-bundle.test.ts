import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

import { describe, expect, test } from "vitest";

// The guard for #59: nothing the browser loads may import a value from the core's main
// entry, which is the composition root and every server layer behind it. A browser-side
// module takes constants from `@porchlight/core/client`; a type import is erased and is
// fine. The walk starts at every "use client" file and follows local imports, stopping
// at a "use server" file, since the bundler replaces those with references to the
// server.

const SRC = import.meta.dirname;
// `import … from "x"` and `export … from "x"`, then `import "x"` and `import("x")`,
// which load a module with no bindings at all.
const FROM = /(?:import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;
const BARE = /import\s*\(?\s*["']([^"']+)["']/g;
// A directive may sit under a comment; either quote works.
const directive = (name: string) =>
  new RegExp(`^(\\s|//[^\\n]*\\n|/\\*[\\s\\S]*?\\*/)*["']use ${name}["']`);
const USE_CLIENT = directive("client");
const USE_SERVER = directive("server");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

function resolveLocal(from: string, spec: string): string | undefined {
  let base: string;
  if (spec.startsWith("@/")) {
    base = join(SRC, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = normalize(join(dirname(from), spec));
  } else {
    return undefined;
  }
  return [".ts", ".tsx", "/index.ts", "/index.tsx"]
    .map((extension) => base + extension)
    .find((path) => existsSync(path));
}

// Only `import type { … }` is erased whole. With `verbatimModuleSyntax` on, a clause of
// inline `type` bindings still leaves `import {} from "…"` behind, which loads the
// module, so it counts as a value import too.
function importsAValue(typeOnly: string | undefined): boolean {
  return typeOnly === undefined;
}

function browserModulesImportingCore(): string[] {
  const starts = sourceFiles(SRC).filter((path) =>
    USE_CLIENT.test(readFileSync(path, "utf8")),
  );
  const seen = new Set<string>();
  const offenders: string[] = [];
  const pending = [...starts];
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || seen.has(path)) {
      continue;
    }
    seen.add(path);
    const source = readFileSync(path, "utf8");
    if (USE_SERVER.test(source)) {
      continue;
    }
    const edges = [
      ...[...source.matchAll(FROM)].map(([, typeOnly, , spec]) => ({ typeOnly, spec })),
      ...[...source.matchAll(BARE)].map(([, spec]) => ({ typeOnly: undefined, spec })),
    ];
    for (const { typeOnly, spec } of edges) {
      if (spec === undefined || !importsAValue(typeOnly)) {
        continue;
      }
      if (spec === "@porchlight/core") {
        offenders.push(relative(SRC, path));
      }
      const next = resolveLocal(path, spec);
      if (next !== undefined) {
        pending.push(next);
      }
    }
  }
  return offenders.sort();
}

describe("the browser bundle (#59)", () => {
  test("no browser-side module imports a value from the core's main entry", () => {
    expect(browserModulesImportingCore()).toEqual([]);
  });

  test("the check reads every way a module loads another", () => {
    const edges = (source: string) => [
      ...[...source.matchAll(FROM)].map(([, typeOnly, , spec]) => [typeOnly, spec]),
      ...[...source.matchAll(BARE)].map(([, spec]) => [undefined, spec]),
    ];
    expect(edges('import type { Post } from "@porchlight/core";')).toEqual([
      ["type ", "@porchlight/core"],
    ]);
    expect(edges('import { type Post } from "@porchlight/core";')).toEqual([
      [undefined, "@porchlight/core"],
    ]);
    expect(
      edges('export { X } from "./x";\nimport "./y";\nawait import("./z");'),
    ).toEqual([
      [undefined, "./x"],
      [undefined, "./y"],
      [undefined, "./z"],
    ]);
    expect(USE_CLIENT.test('// A note.\n"use client";')).toBe(true);
  });
});
