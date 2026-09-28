import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { PER_EMAIL_PER_HOUR } from "../src/Managers/NotificationManager/Handlers/SubscribeHandler";

// Issue #94 (C18): a number the docs state in words stays in the docs, and this test
// fails when the code changes it. Add a line here when a doc names another limit.
const REPO = resolve(import.meta.dirname, "../../..");

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

function inWords(value: number): string {
  const word = WORDS[value];
  if (word === undefined) {
    throw new Error(`no word for ${String(value)}: write the number as digits`);
  }
  return word;
}

function docText(path: string): string {
  return readFileSync(resolve(REPO, path), "utf8").replace(/\s+/g, " ");
}

describe("numbers the docs state", () => {
  test("docs/setup/email.md names the subscribe limit per address", () => {
    expect(docText("docs/setup/email.md")).toContain(
      `allows ${inWords(PER_EMAIL_PER_HOUR)} tries an hour for one address`,
    );
  });
});
