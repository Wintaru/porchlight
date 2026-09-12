import type { DbClient } from "@porchlight/db";

import { FakeSiteConfigState } from "../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { FakeLoadPostingPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/FakeLoadPostingPolicyHandler";
import { SupabaseLoadPostingPolicyHandler } from "../Accessors/SiteConfigAccessor/Handlers/SupabaseLoadPostingPolicyHandler";
import type { ISiteConfigAccessor } from "../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadPostingPolicyRequest } from "../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { SiteConfigAccessor } from "../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import {
  DEFAULT_POSTING_POLICY,
  POSTING_POLICIES,
  type PostingPolicy,
} from "../Common/PostingPolicy";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

function isPostingPolicy(value: string): value is PostingPolicy {
  return POSTING_POLICIES.some((policy) => policy === value);
}

// The store behind the D20 site settings. The fake reads its one key from
// SITE_CONFIG_FAKE_POSTING, so a test or a local run can close posting without a row.
export function createSiteConfigAccessor(
  env: Environment,
  db: () => DbClient,
): ISiteConfigAccessor {
  switch (readStoreProvider(env, "SITE_CONFIG_PROVIDER")) {
    case "supabase":
      return new SiteConfigAccessor(
        new HandlerResolverBuilder()
          .register(LoadPostingPolicyRequest, new SupabaseLoadPostingPolicyHandler(db()))
          .build(),
      );
    case "fake": {
      const posting = env.SITE_CONFIG_FAKE_POSTING ?? DEFAULT_POSTING_POLICY;
      if (!isPostingPolicy(posting)) {
        throw new Error(
          `SITE_CONFIG_FAKE_POSTING=${posting} is not a posting policy. Known: ${POSTING_POLICIES.join(", ")}.`,
        );
      }
      const state = new FakeSiteConfigState(
        posting,
        readFakeResult(env, "SITE_CONFIG_FAKE_RESULT") === "fail",
      );
      return new SiteConfigAccessor(
        new HandlerResolverBuilder()
          .register(LoadPostingPolicyRequest, new FakeLoadPostingPolicyHandler(state))
          .build(),
      );
    }
  }
}
