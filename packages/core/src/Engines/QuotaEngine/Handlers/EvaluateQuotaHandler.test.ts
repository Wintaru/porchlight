import { describe, expect, test } from "vitest";

import type { AttachmentQuotaByTrust } from "../../../Common/AttachmentQuota";
import { EvaluateQuotaRequest } from "../Requests/EvaluateQuotaRequest";
import { QuotaAllowedResponse } from "../Responses/QuotaAllowedResponse";
import { QuotaExceededResponse } from "../Responses/QuotaExceededResponse";
import { EvaluateQuotaHandler } from "./EvaluateQuotaHandler";

const QUOTA_BY_TRUST: AttachmentQuotaByTrust = {
  probation: { maxFileBytes: 1_000_000, maxAccountBytes: 2_000_000 },
  trusted: { maxFileBytes: 10_000_000, maxAccountBytes: 100_000_000 },
};

describe("EvaluateQuotaHandler", () => {
  test("a member's file under both caps is allowed", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "member", trustLevel: "probation", quotaByTrust: QUOTA_BY_TRUST },
        500_000,
        { bytesUsed: 0, filesCount: 0 },
      ),
    );

    expect(result).toBeInstanceOf(QuotaAllowedResponse);
  });

  test("a single file over the per-file cap is file-too-large, even with room in the account", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "member", trustLevel: "probation", quotaByTrust: QUOTA_BY_TRUST },
        1_500_000,
        { bytesUsed: 0, filesCount: 0 },
      ),
    );

    expect(result).toBeInstanceOf(QuotaExceededResponse);
    expect(result).toMatchObject({ reason: "file-too-large", limit: 1_000_000 });
  });

  test("a probation member who would cross the account total hits account-cap", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "member", trustLevel: "probation", quotaByTrust: QUOTA_BY_TRUST },
        900_000,
        { bytesUsed: 1_500_000, filesCount: 3 },
      ),
    );

    expect(result).toMatchObject({ reason: "account-cap", limit: 2_000_000 });
  });

  test("a trusted member's higher caps admit what would fail for probation", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "member", trustLevel: "trusted", quotaByTrust: QUOTA_BY_TRUST },
        1_500_000,
        { bytesUsed: 0, filesCount: 0 },
      ),
    );

    expect(result).toBeInstanceOf(QuotaAllowedResponse);
  });

  test("an anonymous author's fourth image hits the D15 fixed file-count cap", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "anonymous", cap: { files: 3, bytesPerFile: 2_097_152 } },
        500_000,
        { bytesUsed: 0, filesCount: 3 },
      ),
    );

    expect(result).toMatchObject({ reason: "file-count-cap", limit: 3 });
  });

  test("an anonymous author's oversized image hits the fixed per-file cap first", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "anonymous", cap: { files: 3, bytesPerFile: 2_097_152 } },
        3_000_000,
        { bytesUsed: 0, filesCount: 0 },
      ),
    );

    expect(result).toMatchObject({ reason: "file-too-large", limit: 2_097_152 });
  });

  test("an anonymous author's first two small images are allowed", async () => {
    const handler = new EvaluateQuotaHandler();

    const result = await handler.handle(
      new EvaluateQuotaRequest(
        { kind: "anonymous", cap: { files: 3, bytesPerFile: 2_097_152 } },
        500_000,
        { bytesUsed: 0, filesCount: 1 },
      ),
    );

    expect(result).toBeInstanceOf(QuotaAllowedResponse);
  });
});
