import type { DbClient } from "@porchlight/db";

import { FakeNotificationState } from "../Accessors/NotificationAccessor/FakeNotificationState";
import { FakeListNotificationsHandler } from "../Accessors/NotificationAccessor/Handlers/FakeListNotificationsHandler";
import { FakeMarkNotificationsReadHandler } from "../Accessors/NotificationAccessor/Handlers/FakeMarkNotificationsReadHandler";
import { FakeRecordNotificationHandler } from "../Accessors/NotificationAccessor/Handlers/FakeRecordNotificationHandler";
import { SupabaseListNotificationsHandler } from "../Accessors/NotificationAccessor/Handlers/SupabaseListNotificationsHandler";
import { SupabaseMarkNotificationsReadHandler } from "../Accessors/NotificationAccessor/Handlers/SupabaseMarkNotificationsReadHandler";
import { SupabaseRecordNotificationHandler } from "../Accessors/NotificationAccessor/Handlers/SupabaseRecordNotificationHandler";
import type { INotificationAccessor } from "../Accessors/NotificationAccessor/INotificationAccessor";
import { NotificationAccessor } from "../Accessors/NotificationAccessor/NotificationAccessor";
import { ListNotificationsRequest } from "../Accessors/NotificationAccessor/Requests/ListNotificationsRequest";
import { MarkNotificationsReadRequest } from "../Accessors/NotificationAccessor/Requests/MarkNotificationsReadRequest";
import { RecordNotificationRequest } from "../Accessors/NotificationAccessor/Requests/RecordNotificationRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { readFakeResult, readStoreProvider } from "./readStoreProvider";

// The store behind every notification a Manager records and the bell reads back
// (SPEC.md §8).
export function createNotificationAccessor(
  env: Environment,
  db: () => DbClient,
): INotificationAccessor {
  switch (readStoreProvider(env, "NOTIFICATION_PROVIDER")) {
    case "supabase":
      return createSupabaseNotificationAccessor(db());
    case "fake":
      return createFakeNotificationAccessor(
        new FakeNotificationState(
          readFakeResult(env, "NOTIFICATION_FAKE_RESULT") === "fail",
        ),
      );
  }
}

function createSupabaseNotificationAccessor(db: DbClient): INotificationAccessor {
  return new NotificationAccessor(
    new HandlerResolverBuilder()
      .register(RecordNotificationRequest, new SupabaseRecordNotificationHandler(db))
      .register(
        MarkNotificationsReadRequest,
        new SupabaseMarkNotificationsReadHandler(db),
      )
      .build(),
    new HandlerResolverBuilder()
      .register(ListNotificationsRequest, new SupabaseListNotificationsHandler(db))
      .build(),
  );
}

function createFakeNotificationAccessor(
  state: FakeNotificationState,
): INotificationAccessor {
  return new NotificationAccessor(
    new HandlerResolverBuilder()
      .register(RecordNotificationRequest, new FakeRecordNotificationHandler(state))
      .register(MarkNotificationsReadRequest, new FakeMarkNotificationsReadHandler(state))
      .build(),
    new HandlerResolverBuilder()
      .register(ListNotificationsRequest, new FakeListNotificationsHandler(state))
      .build(),
  );
}
