import { defineConfig } from "vitest/config";

// Every test here needs the local Supabase stack (docs/setup/supabase.md). The global
// setup fails fast with one message when it is down.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // The tests share one seeded database. They run one file at a time, and a file that
    // must commit (a PostgREST read cannot see an open transaction) removes its own rows.
    fileParallelism: false,
  },
});
