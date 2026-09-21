import { expect, test } from "vitest";

import { createDbClient } from "../src/index";
import { LOCAL_STACK } from "./local-stack";

// Issue #38's regression test, over PostgREST as the service role, the same path
// SupabaseStoreSiteConfigEntriesHandler takes. PostgREST maps a JSON null in the body
// to SQL NULL, so `site_config.value` has to accept NULL for an unset key. The keys
// come from the seed itself (the ones it leaves unset), so a key added later is covered
// without editing this file, and writing null to them is the seed's own steady state.
const service = createDbClient(LOCAL_STACK.apiUrl, LOCAL_STACK.serviceRoleKey);

test("every key the seed leaves unset can be saved as null and reads back as null", async () => {
  const { data: seeded, error: seedError } = await service
    .from("site_config")
    .select("key")
    .is("value", null);
  expect(seedError).toBeNull();
  const keys = (seeded ?? []).map((row) => row.key);
  expect(keys.length).toBeGreaterThan(0);

  const rows = keys.map((key) => ({ key, value: null, updated_by: null }));
  const { error } = await service.from("site_config").upsert(rows, { onConflict: "key" });
  expect(error).toBeNull();

  const { data, error: readError } = await service
    .from("site_config")
    .select("key, value")
    .in("key", keys);
  expect(readError).toBeNull();
  expect(data).toEqual(keys.map((key) => ({ key, value: null })));
});
