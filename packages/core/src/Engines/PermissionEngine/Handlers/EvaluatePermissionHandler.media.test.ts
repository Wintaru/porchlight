import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import type { Profile } from "../../../Common/Profile";
import type { ScanStatus } from "../../../Common/ScanStatus";
import type { UserRole } from "../../../Common/UserRole";
import type { PermissionSubject } from "../PermissionSubject";
import { EvaluatePermissionRequest } from "../Requests/EvaluatePermissionRequest";
import { PermissionGrantedResponse } from "../Responses/PermissionGrantedResponse";
import { EvaluatePermissionHandler } from "./EvaluatePermissionHandler";

// Who may open an upload's quarantine original (SPEC.md §7, #36): its owner and staff,
// published or not — the public copy is a URL, not this; nobody once it is locked.
const AT = new Date("2026-09-25T10:00:00.000Z");
const OWNER_ID = "00000000-0000-4000-8000-000000000003";

function member(role: UserRole, id: string): Actor {
  const profile: Profile = {
    id,
    handle: `${role}-${id.slice(-2)}`,
    displayName: null,
    avatarUrl: null,
    bio: null,
    role,
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
  };
  return { kind: "member", profile };
}

const OWNER = member("member", OWNER_ID);
const STRANGER = member("member", "00000000-0000-4000-8000-000000000009");
const MODERATOR = member("moderator", "00000000-0000-4000-8000-000000000002");
const ADMIN = member("admin", "00000000-0000-4000-8000-000000000001");

function media(scanStatus: ScanStatus, publishedPath: string | null): PermissionSubject {
  return {
    kind: "media",
    id: "00000000-0000-4000-8000-0000000000d9",
    owner: { kind: "member", profileId: OWNER_ID },
    publishedPath,
    scanStatus,
  };
}

async function mayView(actor: Actor, subject: PermissionSubject): Promise<boolean> {
  const handler = new EvaluatePermissionHandler(
    fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
  );
  const response = await handler.handle(
    new EvaluatePermissionRequest(actor, "media.view", subject),
  );
  return response instanceof PermissionGrantedResponse;
}

describe("media.view", () => {
  test("a flagged original is its owner's and staff's to see, not another member's", async () => {
    const flagged = media("flagged", null);
    expect(await mayView(OWNER, flagged)).toBe(true);
    expect(await mayView(MODERATOR, flagged)).toBe(true);
    expect(await mayView(ADMIN, flagged)).toBe(true);
    expect(await mayView(STRANGER, flagged)).toBe(false);
  });

  test("a published copy does not open the original to anyone else", async () => {
    const published = media("clear", "public-media/x.jpg");
    expect(await mayView(STRANGER, published)).toBe(false);
    expect(await mayView(OWNER, published)).toBe(true);
  });

  test("nobody views a locked item, not even its owner or an admin", async () => {
    const locked = media("locked", null);
    for (const actor of [OWNER, MODERATOR, ADMIN]) {
      expect(await mayView(actor, locked)).toBe(false);
    }
  });
});
