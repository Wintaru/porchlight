import { describe, expect, test } from "vitest";

import type { ModerationThresholds } from "../../../Common/ModerationThresholds";
import { EvaluateModerationRequest } from "../Requests/EvaluateModerationRequest";
import { ContentClearResponse } from "../Responses/ContentClearResponse";
import { ContentFlaggedResponse } from "../Responses/ContentFlaggedResponse";
import { ContentLockedResponse } from "../Responses/ContentLockedResponse";
import { EvaluateModerationHandler } from "./EvaluateModerationHandler";

const THRESHOLDS: ModerationThresholds = { flagAt: 0.5, lockAt: 0.9 };

describe("EvaluateModerationHandler", () => {
  test("a hash match locks even with no image classification", async () => {
    const handler = new EvaluateModerationHandler();

    const result = await handler.handle(
      new EvaluateModerationRequest(true, undefined, THRESHOLDS),
    );

    expect(result).toBeInstanceOf(ContentLockedResponse);
    expect(result).toMatchObject({ reason: "hash-match" });
  });

  test("a minors signal locks regardless of severity score", async () => {
    const handler = new EvaluateModerationHandler();

    const result = await handler.handle(
      new EvaluateModerationRequest(
        false,
        { severityScore: 0.1, minorsSignal: true },
        THRESHOLDS,
      ),
    );

    expect(result).toBeInstanceOf(ContentLockedResponse);
    expect(result).toMatchObject({ reason: "minors-signal" });
  });

  test("a severity score at or above the lock threshold locks", async () => {
    const handler = new EvaluateModerationHandler();

    const result = await handler.handle(
      new EvaluateModerationRequest(
        false,
        { severityScore: 0.9, minorsSignal: false },
        THRESHOLDS,
      ),
    );

    expect(result).toBeInstanceOf(ContentLockedResponse);
    expect(result).toMatchObject({ reason: "severity" });
  });

  test("a severity score at or above the flag threshold, but under lock, is flagged", async () => {
    const handler = new EvaluateModerationHandler();

    const result = await handler.handle(
      new EvaluateModerationRequest(
        false,
        { severityScore: 0.7, minorsSignal: false },
        THRESHOLDS,
      ),
    );

    expect(result).toBeInstanceOf(ContentFlaggedResponse);
  });

  test("a low severity score with no hash match is clear", async () => {
    const handler = new EvaluateModerationHandler();

    const result = await handler.handle(
      new EvaluateModerationRequest(
        false,
        { severityScore: 0.1, minorsSignal: false },
        THRESHOLDS,
      ),
    );

    expect(result).toBeInstanceOf(ContentClearResponse);
  });

  test("no hash match and no image classification (a non-image attachment) is clear", async () => {
    const handler = new EvaluateModerationHandler();

    const result = await handler.handle(
      new EvaluateModerationRequest(false, undefined, THRESHOLDS),
    );

    expect(result).toBeInstanceOf(ContentClearResponse);
  });
});
