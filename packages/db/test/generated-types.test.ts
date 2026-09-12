import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const GENERATED = new URL("../src/database.types.ts", import.meta.url);

// src/database.types.ts is derived from the migrations. Nothing forces the two to agree,
// so this is the guard: a schema change without `pnpm --filter @porchlight/db gen:types`
// fails here instead of surfacing as a type error in an Accessor later.
test("the committed database types match the running schema", async () => {
  const [{ stdout }, committed] = await Promise.all([
    execFileAsync(
      "supabase",
      ["gen", "types", "typescript", "--local", "--schema", "public"],
      {
        maxBuffer: 16 * 1024 * 1024,
      },
    ),
    readFile(GENERATED, "utf8"),
  ]);
  expect(committed).toBe(stdout);
}, 60_000);
