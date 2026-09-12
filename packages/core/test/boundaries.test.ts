import { resolve } from "node:path";

import tsParser from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import { describe, expect, test } from "vitest";

import { boundariesConfig, boundariesSettings } from "../../../eslint.boundaries.js";

// Lints one virtual file against the boundary policy alone (no type-aware rules). The
// element patterns, the file categories and the rules are the exact objects that
// eslint.config.js spreads into the root config. Three settings differ from the root
// config: the root path points at a fixture tree that mirrors the workspace layout with
// empty modules, the ignore list is empty so fixture paths are classified, and the
// resolver maps @porchlight/* through the fixture tsconfig `paths` instead of the pnpm
// symlinks. Relative imports resolve to a real file, so the plugin classifies both ends.
const FIXTURE_ROOT = resolve(import.meta.dirname, "fixtures/boundaries");

const eslint = new ESLint({
  cwd: FIXTURE_ROOT,
  overrideConfigFile: true,
  ignore: false,
  overrideConfig: [
    {
      ...boundariesConfig,
      languageOptions: { parser: tsParser },
      settings: {
        ...boundariesSettings,
        "boundaries/root-path": FIXTURE_ROOT,
        "boundaries/ignore": [],
        "import/resolver": {
          typescript: { project: resolve(FIXTURE_ROOT, "tsconfig.json") },
        },
      },
    },
  ],
});

async function lintImport(
  fromFile: string,
  importPath: string,
): Promise<readonly string[]> {
  const [result] = await eslint.lintText(`import "${importPath}";\n`, {
    filePath: resolve(FIXTURE_ROOT, fromFile),
  });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

// Every source layer appears in both lists. A source that only appears under `allowed`
// would pass vacuously if its pattern stopped classifying it, because the plugin skips
// files it cannot place.
const cases = {
  allowed: [
    ["apps/web/src/app/page.tsx", "@porchlight/core"],
    ["apps/web/src/app/page.tsx", "../read-model/feed"],
    ["apps/web/src/app/page.tsx", "react"],
    ["apps/web/src/read-model/feed.ts", "@porchlight/db"],
    ["apps/web/src/app/page.tsx", "../auth/current-user"],
    ["apps/web/src/auth/current-user.ts", "@porchlight/db"],
    ["apps/web/src/auth/current-user.ts", "./session-client"],
    ["apps/web/src/auth/current-user.ts", "next/headers"],
    ["packages/core/src/index.ts", "./Composition/CompositionRoot"],
    ["packages/core/src/index.ts", "./Managers/PostManager/PostManager"],
    ["packages/core/src/index.ts", "./Common/RequestBase"],
    [
      "packages/core/src/Composition/CompositionRoot.ts",
      "../Accessors/PostAccessor/PostAccessor",
    ],
    ["packages/core/src/Composition/CompositionRoot.ts", "@porchlight/db"],
    [
      "packages/core/src/Managers/PostManager/PostManager.ts",
      "../../Engines/ContentRenderEngine/ContentRenderEngine",
    ],
    [
      "packages/core/src/Managers/PostManager/PostManager.ts",
      "../../Accessors/PostAccessor/PostAccessor",
    ],
    ["packages/core/src/Managers/PostManager/PostManager.ts", "../../Common/RequestBase"],
    [
      "packages/core/src/Managers/PostManager/Handlers/CreatePostHandler.ts",
      "../Requests/CreatePostRequest",
    ],
    [
      "packages/core/src/Engines/QuotaEngine/QuotaEngine.ts",
      "../../Accessors/ProfileAccessor/ProfileAccessor",
    ],
    ["packages/core/src/Accessors/PostAccessor/PostAccessor.ts", "@porchlight/db"],
    ["packages/core/src/Accessors/PostAccessor/PostAccessor.ts", "node:crypto"],
    [
      "packages/core/src/Accessors/PostAccessor/PostAccessor.ts",
      "../../Utilities/logger/Logger",
    ],
    ["packages/core/src/Utilities/ids/Ids.ts", "../logger/Logger"],
    ["packages/db/src/client.ts", "@supabase/supabase-js"],
  ],
  forbidden: [
    // The Client bypasses its Manager.
    ["apps/web/src/app/page.tsx", "@porchlight/db"],
    ["apps/web/src/app/page.tsx", "@supabase/supabase-js"],
    [
      "apps/web/src/app/page.tsx",
      "@porchlight/core/src/Managers/PostManager/PostManager",
    ],
    [
      "apps/web/src/app/page.tsx",
      "../../../../packages/core/src/Accessors/PostAccessor/PostAccessor",
    ],
    ["apps/web/src/read-model/feed.ts", "@porchlight/core"],
    ["apps/web/src/auth/current-user.ts", "@porchlight/core"],
    ["apps/web/src/auth/current-user.ts", "@supabase/ssr"],
    ["apps/web/src/auth/current-user.ts", "../lib/site"],
    // The core entry reaches past the Managers.
    ["packages/core/src/index.ts", "./Accessors/PostAccessor/PostAccessor"],
    ["packages/core/src/index.ts", "react"],
    // Upward calls.
    [
      "packages/core/src/Accessors/PostAccessor/PostAccessor.ts",
      "../../Managers/PostManager/PostManager",
    ],
    [
      "packages/core/src/Engines/QuotaEngine/QuotaEngine.ts",
      "../../Managers/PostManager/PostManager",
    ],
    [
      "packages/core/src/Utilities/logger/Logger.ts",
      "../../Accessors/PostAccessor/PostAccessor",
    ],
    ["packages/core/src/Common/RequestBase.ts", "../Managers/PostManager/PostManager"],
    ["packages/db/src/client.ts", "@porchlight/core"],
    // Sideways calls.
    [
      "packages/core/src/Managers/PostManager/PostManager.ts",
      "../CommentManager/CommentManager",
    ],
    [
      "packages/core/src/Engines/QuotaEngine/QuotaEngine.ts",
      "../PermissionEngine/PermissionEngine",
    ],
    [
      "packages/core/src/Accessors/PostAccessor/PostAccessor.ts",
      "../CommentAccessor/CommentAccessor",
    ],
    // A file that belongs to no element: a barrel or a flat file under a layer folder,
    // or a folder the policy does not know.
    ["packages/core/src/Managers/index.ts", "./PostManager/PostManager"],
    ["packages/core/src/Managers/PostManager.ts", "./CommentManager/CommentManager"],
    ["packages/core/src/Helpers/Helper.ts", "../Managers/PostManager/PostManager"],
    // Supabase from anywhere but packages/db.
    ["packages/core/src/Accessors/PostAccessor/PostAccessor.ts", "@supabase/supabase-js"],
    ["apps/web/src/read-model/feed.ts", "@supabase/supabase-js"],
    // A UI framework inside the core.
    ["packages/core/src/Managers/PostManager/PostManager.ts", "react"],
    ["packages/core/src/Composition/CompositionRoot.ts", "next/headers"],
    ["packages/db/src/client.ts", "react"],
  ],
} as const;

describe("iDesign boundary policy", () => {
  test.each(cases.allowed)("allows %s → %s", async (fromFile, importPath) => {
    await expect(lintImport(fromFile, importPath)).resolves.toEqual([]);
  });

  test.each(cases.forbidden)("refuses %s → %s", async (fromFile, importPath) => {
    const ruleIds = await lintImport(fromFile, importPath);
    expect(ruleIds.length).toBeGreaterThan(0);
    expect(ruleIds.every((id) => id.startsWith("boundaries/"))).toBe(true);
  });
});
