import type { DbClient } from "@porchlight/db";

import { FakeAuditState } from "../Accessors/AuditAccessor/FakeAuditState";
import { FakeListAuditLogHandler } from "../Accessors/AuditAccessor/Handlers/FakeListAuditLogHandler";
import { FakeRecordAuditEventHandler } from "../Accessors/AuditAccessor/Handlers/FakeRecordAuditEventHandler";
import { SupabaseListAuditLogHandler } from "../Accessors/AuditAccessor/Handlers/SupabaseListAuditLogHandler";
import { SupabaseRecordAuditEventHandler } from "../Accessors/AuditAccessor/Handlers/SupabaseRecordAuditEventHandler";
import type { IAuditAccessor } from "../Accessors/AuditAccessor/IAuditAccessor";
import { AuditAccessor } from "../Accessors/AuditAccessor/AuditAccessor";
import { ListAuditLogRequest } from "../Accessors/AuditAccessor/Requests/ListAuditLogRequest";
import { RecordAuditEventRequest } from "../Accessors/AuditAccessor/Requests/RecordAuditEventRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind the append-only audit_log record and the ListAuditLog query
// (SPEC.md §7).
export function createAuditAccessor(
  env: Environment,
  db: () => DbClient,
): IAuditAccessor {
  switch (readStoreProvider(env, "AUDIT_PROVIDER")) {
    case "supabase":
      return new AuditAccessor(
        new HandlerResolverBuilder()
          .register(RecordAuditEventRequest, new SupabaseRecordAuditEventHandler(db()))
          .build(),
        new HandlerResolverBuilder()
          .register(ListAuditLogRequest, new SupabaseListAuditLogHandler(db()))
          .build(),
      );
    case "fake": {
      const state = new FakeAuditState(
        readFakeResult(env, "AUDIT_FAKE_RESULT") === "fail",
      );
      return new AuditAccessor(
        new HandlerResolverBuilder()
          .register(RecordAuditEventRequest, new FakeRecordAuditEventHandler(state))
          .build(),
        new HandlerResolverBuilder()
          .register(ListAuditLogRequest, new FakeListAuditLogHandler(state))
          .build(),
      );
    }
  }
}
