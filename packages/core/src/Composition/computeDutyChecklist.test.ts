import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { computeDutyChecklist } from "./computeDutyChecklist";

// #18: the admin duty checklist links a setup guide for every provider it lists. This
// walks the same list the admin page renders and proves each `setupGuidePath` resolves
// to a real file, so a renamed or deleted guide fails here instead of as a dead link.
const REPO_ROOT = resolve(import.meta.dirname, "../../../..");

describe("computeDutyChecklist", () => {
  test("every row's setup guide exists", () => {
    const checklist = computeDutyChecklist({});
    expect(checklist.length).toBeGreaterThan(0);

    for (const item of checklist) {
      expect(item.setupGuidePath).toMatch(/^docs\/setup\/[\w-]+\.md$/);
      expect(existsSync(resolve(REPO_ROOT, item.setupGuidePath))).toBe(true);
    }
  });
});
