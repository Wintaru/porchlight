import type { DbClient } from "@porchlight/db";

import { FakeAdjustQuotaUsageHandler } from "../Accessors/QuotaAccessor/Handlers/FakeAdjustQuotaUsageHandler";
import { FakeLoadQuotaUsageHandler } from "../Accessors/QuotaAccessor/Handlers/FakeLoadQuotaUsageHandler";
import { SupabaseAdjustQuotaUsageHandler } from "../Accessors/QuotaAccessor/Handlers/SupabaseAdjustQuotaUsageHandler";
import { SupabaseLoadQuotaUsageHandler } from "../Accessors/QuotaAccessor/Handlers/SupabaseLoadQuotaUsageHandler";
import { FakeQuotaState } from "../Accessors/QuotaAccessor/FakeQuotaState";
import type { IQuotaAccessor } from "../Accessors/QuotaAccessor/IQuotaAccessor";
import { QuotaAccessor } from "../Accessors/QuotaAccessor/QuotaAccessor";
import { AdjustQuotaUsageRequest } from "../Accessors/QuotaAccessor/Requests/AdjustQuotaUsageRequest";
import { LoadQuotaUsageRequest } from "../Accessors/QuotaAccessor/Requests/LoadQuotaUsageRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind a member's running upload total (SPEC.md §6).
export function createQuotaAccessor(
  env: Environment,
  db: () => DbClient,
): IQuotaAccessor {
  switch (readStoreProvider(env, "QUOTA_PROVIDER")) {
    case "supabase": {
      const client = db();
      return new QuotaAccessor(
        new HandlerResolverBuilder()
          .register(LoadQuotaUsageRequest, new SupabaseLoadQuotaUsageHandler(client))
          .build(),
        new HandlerResolverBuilder()
          .register(AdjustQuotaUsageRequest, new SupabaseAdjustQuotaUsageHandler(client))
          .build(),
      );
    }
    case "fake": {
      const state = new FakeQuotaState(
        readFakeResult(env, "QUOTA_FAKE_RESULT") === "fail",
      );
      return new QuotaAccessor(
        new HandlerResolverBuilder()
          .register(LoadQuotaUsageRequest, new FakeLoadQuotaUsageHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(AdjustQuotaUsageRequest, new FakeAdjustQuotaUsageHandler(state))
          .build(),
      );
    }
  }
}
