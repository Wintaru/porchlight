import { describe, expect, test } from "vitest";

import {
  BODY_MAX_LENGTH,
  parseIntent,
  parsePostForm,
  SUMMARY_MAX_LENGTH,
  TAG_MAX_LENGTH,
  TAGS_MAX_COUNT,
  TITLE_MAX_LENGTH,
} from "./parse-post-form";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

describe("parsePostForm", () => {
  test("trims, splits tags, maps the selects and the checkbox", () => {
    const parsed = parsePostForm(
      form({
        title: "  The bench  ",
        bodyMd: "It wobbles.\r\n\r\nFine.\n",
        summary: " Three weekends ",
        tags: " Woodworking, garden ,, ",
        visibility: "unlisted",
        commentsEnabled: "on",
        coverMediaId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(parsed).toEqual({
      ok: true,
      draft: {
        title: "The bench",
        bodyMd: "It wobbles.\n\nFine.\n",
        summary: "Three weekends",
        tags: ["Woodworking", "garden"],
        visibility: "unlisted",
        commentsEnabled: true,
        coverMediaId: "11111111-1111-4111-8111-111111111111",
      },
    });
  });

  test("empty summary is null, a missing checkbox is false, a bad visibility is public", () => {
    const parsed = parsePostForm(
      form({ title: "x", bodyMd: "", summary: "", visibility: "secret" }),
    );
    expect(parsed).toMatchObject({
      ok: true,
      draft: { summary: null, commentsEnabled: false, visibility: "public", tags: [] },
    });
  });

  test("an empty or malformed cover field is no cover", () => {
    for (const coverMediaId of ["", "not-an-id", "../etc"]) {
      expect(parsePostForm(form({ title: "x", bodyMd: "", coverMediaId }))).toMatchObject(
        {
          ok: true,
          draft: { coverMediaId: null },
        },
      );
    }
  });

  test("refuses a blank title and every over-long field", () => {
    const base = { title: "x", bodyMd: "", summary: "", tags: "" };
    const cases: readonly [Record<string, string>, string][] = [
      [{ ...base, title: "  " }, "title-blank"],
      [{ ...base, title: "t".repeat(TITLE_MAX_LENGTH + 1) }, "title-length"],
      [{ ...base, summary: "s".repeat(SUMMARY_MAX_LENGTH + 1) }, "summary-length"],
      [{ ...base, bodyMd: "b".repeat(BODY_MAX_LENGTH + 1) }, "body-length"],
      [
        {
          ...base,
          tags: Array.from(
            { length: TAGS_MAX_COUNT + 1 },
            (_, i) => `t${String(i)}`,
          ).join(","),
        },
        "tags-count",
      ],
      [{ ...base, tags: "x".repeat(TAG_MAX_LENGTH + 1) }, "tag-length"],
    ];
    for (const [fields, error] of cases) {
      expect(parsePostForm(form(fields)), error).toEqual({ ok: false, error });
    }
  });
});

test("parseIntent reads the button that was clicked", () => {
  expect(parseIntent(form({ intent: "publish" }))).toBe("publish");
  expect(parseIntent(form({ intent: "save" }))).toBe("save");
  expect(parseIntent(form({}))).toBe("save");
});
