import { expect, test } from "vitest";

import { robotsRules } from "./robots-rules";

test("with no Arachnid token, robots.txt only allows everyone", () => {
  expect(robotsRules(undefined)).toEqual({ userAgent: "*", allow: "/" });
  expect(robotsRules("  ")).toEqual({ userAgent: "*", allow: "/" });
});

test("an Arachnid token adds its verification User-Agent", () => {
  expect(robotsRules(" ABC123 ")).toEqual([
    { userAgent: "*", allow: "/" },
    { userAgent: "ProjectArachnid/ABC123", allow: "/" },
  ]);
});
