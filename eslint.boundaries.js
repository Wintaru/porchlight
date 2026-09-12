// The iDesign call graph as an ESLint policy (SPEC.md §3). This file is the single
// source of truth for which layer may import which. eslint.config.js spreads it into the
// root config, and packages/core/test/boundaries.test.ts lints fixtures against exactly
// this slice, so a policy edit that opens a forbidden path fails `pnpm test`.
//
//   Client → core entry → Manager → {Engine, Accessor} → Utility
//   Engine → Accessor
//   read-model is the only browser path to Supabase (D2).
//   auth is the only Client path to the session cookies (SPEC.md §4).
//
// Each Manager, Engine, Accessor and Utility folder is its own element, so a sideways
// import (Manager → Manager, Engine → Engine, Accessor → Accessor) is a different element
// and the policy can refuse it. The Client reaches the core only through its public
// entry, packages/core/src/index.ts. A file that belongs to no element (a barrel directly
// under Managers/, a new folder under packages/core/src) is a lint error, not a file with
// default privileges.
import boundaries from "eslint-plugin-boundaries";

export const LAYER = Object.freeze({
  client: "client",
  readModel: "read-model",
  auth: "auth",
  composition: "composition",
  common: "common",
  manager: "manager",
  engine: "engine",
  accessor: "accessor",
  utility: "utility",
  db: "db",
});

// The one file the Client may import from packages/core. A file category, not an
// element, so it never swallows stray files under packages/core/src.
const CORE_ENTRY = "core-entry";

const WORKSPACE_PACKAGES = ["@porchlight/*"];
const SUPABASE_PACKAGES = ["@supabase/*"];
const UI_PACKAGES = ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"];

const SERVER_LAYERS = [
  LAYER.composition,
  LAYER.common,
  LAYER.manager,
  LAYER.engine,
  LAYER.accessor,
  LAYER.utility,
  LAYER.db,
];

const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { type: to } } },
});

export const boundariesSettings = {
  "boundaries/root-path": import.meta.dirname,
  "boundaries/ignore": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/test/**",
    "**/e2e/**",
    "**/vitest.config.ts",
  ],
  "boundaries/elements": [
    { type: LAYER.readModel, pattern: "apps/web/src/read-model" },
    { type: LAYER.auth, pattern: "apps/web/src/auth" },
    { type: LAYER.client, pattern: "apps/web" },
    { type: LAYER.composition, pattern: "packages/core/src/Composition" },
    { type: LAYER.common, pattern: "packages/core/src/Common" },
    { type: LAYER.manager, pattern: "packages/core/src/Managers/*", capture: ["name"] },
    { type: LAYER.engine, pattern: "packages/core/src/Engines/*", capture: ["name"] },
    { type: LAYER.accessor, pattern: "packages/core/src/Accessors/*", capture: ["name"] },
    { type: LAYER.utility, pattern: "packages/core/src/Utilities/*", capture: ["name"] },
    { type: LAYER.db, pattern: "packages/db" },
  ],
  "boundaries/files": [{ pattern: "packages/core/src/index.ts", category: CORE_ENTRY }],
  "import/resolver": {
    typescript: {
      alwaysTryTypes: true,
      project: ["apps/*/tsconfig.json", "packages/*/tsconfig.json"],
      noWarnOnMultipleProjects: true,
    },
  },
};

const ANY = { element: { type: "*" } };
const CORE_ENTRY_FILE = { file: { categories: CORE_ENTRY } };
const EXTERNAL_ORIGINS = ["external", "core"];
const anyExternalModule = { module: { origin: EXTERNAL_ORIGINS } };
const externalModule = (source) => ({ module: { origin: EXTERNAL_ORIGINS, source } });

/** @type {import("eslint").Linter.RulesRecord} */
export const boundariesRules = {
  "boundaries/no-unknown-files": "error",
  "boundaries/dependencies": [
    "error",
    {
      default: "disallow",
      checkAllOrigins: true,
      // Later policies win over earlier ones, so the broad grants come first and the
      // narrow refusals last.
      policies: [
        // npm and Node built-in modules are open unless a policy below closes one.
        { from: ANY, allow: { to: anyExternalModule } },
        {
          from: { element: { type: LAYER.client } },
          allow: {
            to: [
              { element: { type: [LAYER.client, LAYER.readModel, LAYER.auth] } },
              CORE_ENTRY_FILE,
            ],
          },
        },
        allow(LAYER.readModel, [LAYER.readModel, LAYER.db, LAYER.common]),
        // The session client over @supabase/ssr lives in packages/db; auth adapts the
        // Next.js cookie jar to it and knows nothing of the core.
        allow(LAYER.auth, [LAYER.auth, LAYER.db]),
        {
          from: CORE_ENTRY_FILE,
          allow: {
            to: { element: { type: [LAYER.composition, LAYER.manager, LAYER.common] } },
          },
        },
        // The composition root builds the clients the accessors are handed (D2), so it
        // is the one place in the core besides the accessors that may see packages/db.
        allow(LAYER.composition, [
          LAYER.manager,
          LAYER.engine,
          LAYER.accessor,
          LAYER.utility,
          LAYER.common,
          LAYER.db,
        ]),
        allow(LAYER.manager, [LAYER.engine, LAYER.accessor, LAYER.utility, LAYER.common]),
        allow(LAYER.engine, [LAYER.accessor, LAYER.utility, LAYER.common]),
        allow(LAYER.accessor, [LAYER.utility, LAYER.common, LAYER.db]),
        allow(LAYER.utility, [LAYER.utility, LAYER.common]),
        allow(LAYER.common, [LAYER.common]),
        allow(LAYER.db, [LAYER.db]),
        // A workspace specifier that resolves lands in a local element above. One that
        // does not resolve is a deep subpath around a package's public entry, which the
        // plugin would otherwise wave through as an external module.
        { from: ANY, disallow: { to: externalModule(WORKSPACE_PACKAGES) } },
        // Only packages/db talks to Supabase. Accessors and the read-model go through it.
        { from: ANY, disallow: { to: externalModule(SUPABASE_PACKAGES) } },
        {
          from: { element: { type: LAYER.db } },
          allow: { to: externalModule(SUPABASE_PACKAGES) },
        },
        // packages/core and packages/db stay free of UI framework imports.
        {
          from: { element: { type: SERVER_LAYERS } },
          disallow: { to: externalModule(UI_PACKAGES) },
        },
      ],
    },
  ],
};

/** @type {import("eslint").Linter.Config} */
export const boundariesConfig = {
  files: ["**/*.{ts,tsx}"],
  plugins: { boundaries },
  settings: boundariesSettings,
  rules: boundariesRules,
};
