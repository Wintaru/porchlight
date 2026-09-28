import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// supabase-js's browser build, for a test page to talk to Realtime directly, the way a
// modified browser could. The web app has no direct dependency on it; the db package
// does.
export const SUPABASE_UMD = join(
  dirname(
    createRequire(new URL("../../../packages/db/package.json", import.meta.url)).resolve(
      "@supabase/supabase-js",
    ),
  ),
  "umd/supabase.js",
);
