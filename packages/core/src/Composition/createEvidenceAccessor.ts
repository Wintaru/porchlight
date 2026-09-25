import type { DbClient } from "@porchlight/db";

import { EvidenceAccessor } from "../Accessors/EvidenceAccessor/EvidenceAccessor";
import { FakeEvidenceState } from "../Accessors/EvidenceAccessor/FakeEvidenceState";
import { FakeStoreTextEvidenceHandler } from "../Accessors/EvidenceAccessor/Handlers/FakeStoreTextEvidenceHandler";
import { SupabaseStoreTextEvidenceHandler } from "../Accessors/EvidenceAccessor/Handlers/SupabaseStoreTextEvidenceHandler";
import type { IEvidenceAccessor } from "../Accessors/EvidenceAccessor/IEvidenceAccessor";
import { StoreTextEvidenceRequest } from "../Accessors/EvidenceAccessor/Requests/StoreTextEvidenceRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind a post's and a comment's evidence envelope (SPEC.md §7, #61).
export function createEvidenceAccessor(
  env: Environment,
  db: () => DbClient,
): IEvidenceAccessor {
  switch (readStoreProvider(env, "EVIDENCE_PROVIDER")) {
    case "supabase":
      return new EvidenceAccessor(
        new HandlerResolverBuilder()
          .register(StoreTextEvidenceRequest, new SupabaseStoreTextEvidenceHandler(db()))
          .build(),
      );
    case "fake":
      return new EvidenceAccessor(
        new HandlerResolverBuilder()
          .register(
            StoreTextEvidenceRequest,
            new FakeStoreTextEvidenceHandler(
              new FakeEvidenceState(
                readFakeResult(env, "EVIDENCE_FAKE_RESULT") === "fail",
              ),
            ),
          )
          .build(),
      );
  }
}
