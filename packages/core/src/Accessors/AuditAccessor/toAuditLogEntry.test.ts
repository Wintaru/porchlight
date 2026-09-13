import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { SUBJECT_KINDS } from "../../Common/SubjectKind";
import { toAuditLogEntry } from "./toAuditLogEntry";

// toAuditLogEntry's subject_kind assignment proves every schema value is in the domain
// union. This proves the reverse, so the two sets are equal, not merely overlapping.
test("the domain subject kind union matches the schema enum", () => {
  expect([...SUBJECT_KINDS].sort()).toEqual(
    [...Constants.public.Enums.subject_kind].sort(),
  );
});

test("toAuditLogEntry maps a moderator's event with a subject", () => {
  const entry = toAuditLogEntry({
    id: 1,
    actor_id: "mod1",
    event: "item.rejected",
    subject_kind: "post",
    subject_id: "p1",
    details: { reason: "off-topic" },
    created_at: "2026-09-12T10:00:00.000Z",
  });
  expect(entry).toEqual({
    id: 1,
    actorId: "mod1",
    event: "item.rejected",
    subjectKind: "post",
    subjectId: "p1",
    details: { reason: "off-topic" },
    createdAt: new Date("2026-09-12T10:00:00.000Z"),
  });
});

test("toAuditLogEntry maps a system event with no subject and no actor", () => {
  const entry = toAuditLogEntry({
    id: 2,
    actor_id: null,
    event: "media.locked",
    subject_kind: null,
    subject_id: null,
    details: {},
    created_at: "2026-09-12T10:00:00.000Z",
  });
  expect(entry.actorId).toBeNull();
  expect(entry.subjectKind).toBeNull();
});
