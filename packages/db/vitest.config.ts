import { defineConfig } from "vitest/config";

// Every test here needs the local Supabase stack (docs/setup/supabase.md). The global
// setup fails fast with one message when it is down.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // The tests share one seeded database and never commit, but a parallel run would
    // still race on the PostgREST-side checks. One file at a time is fast enough.
    fileParallelism: false,
  },
});
