import type { DbClient } from "@porchlight/db";

import { FakeFileReportHandler } from "../Accessors/ReportAccessor/Handlers/FakeFileReportHandler";
import { FakeListReportsHandler } from "../Accessors/ReportAccessor/Handlers/FakeListReportsHandler";
import { FakeResolveReportsForTargetHandler } from "../Accessors/ReportAccessor/Handlers/FakeResolveReportsForTargetHandler";
import { SupabaseFileReportHandler } from "../Accessors/ReportAccessor/Handlers/SupabaseFileReportHandler";
import { SupabaseListReportsHandler } from "../Accessors/ReportAccessor/Handlers/SupabaseListReportsHandler";
import { SupabaseResolveReportsForTargetHandler } from "../Accessors/ReportAccessor/Handlers/SupabaseResolveReportsForTargetHandler";
import { FakeReportState } from "../Accessors/ReportAccessor/FakeReportState";
import type { IReportAccessor } from "../Accessors/ReportAccessor/IReportAccessor";
import { ReportAccessor } from "../Accessors/ReportAccessor/ReportAccessor";
import { FileReportRequest } from "../Accessors/ReportAccessor/Requests/FileReportRequest";
import { ListReportsRequest } from "../Accessors/ReportAccessor/Requests/ListReportsRequest";
import { ResolveReportsForTargetRequest } from "../Accessors/ReportAccessor/Requests/ResolveReportsForTargetRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind every report a visitor or member files, and ModerationManager's own
// reads of it (SPEC.md §7).
export function createReportAccessor(
  env: Environment,
  db: () => DbClient,
): IReportAccessor {
  switch (readStoreProvider(env, "REPORT_PROVIDER")) {
    case "supabase":
      return createSupabaseReportAccessor(db());
    case "fake":
      return createFakeReportAccessor(
        new FakeReportState(readFakeResult(env, "REPORT_FAKE_RESULT") === "fail"),
      );
  }
}

function createSupabaseReportAccessor(db: DbClient): IReportAccessor {
  return new ReportAccessor(
    new HandlerResolverBuilder()
      .register(FileReportRequest, new SupabaseFileReportHandler(db))
      .register(
        ResolveReportsForTargetRequest,
        new SupabaseResolveReportsForTargetHandler(db),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(ListReportsRequest, new SupabaseListReportsHandler(db))
      .build(),
  );
}

function createFakeReportAccessor(state: FakeReportState): IReportAccessor {
  return new ReportAccessor(
    new HandlerResolverBuilder()
      .register(FileReportRequest, new FakeFileReportHandler(state))
      .register(
        ResolveReportsForTargetRequest,
        new FakeResolveReportsForTargetHandler(state),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(ListReportsRequest, new FakeListReportsHandler(state))
      .build(),
  );
}
