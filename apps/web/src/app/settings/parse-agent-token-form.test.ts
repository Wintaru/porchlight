import { describe, expect, test } from "vitest";

import { parseAgentTokenForm } from "./parse-agent-token-form";

const NOW = new Date("2026-09-21T10:00:00.000Z");

function form(fields: Readonly<Record<string, string | readonly string[]>>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of typeof value === "string" ? [value] : value) {
      data.append(name, item);
    }
  }
  return data;
}

describe("parseAgentTokenForm", () => {
  test("a name, two scopes and a 30-day expiry", () => {
    const result = parseAgentTokenForm(
      form({ name: " Laptop ", scopes: ["posts:draft", "posts:publish"], expiry: "30" }),
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      values: {
        name: "Laptop",
        scopes: ["posts:draft", "posts:publish"],
        expiresAt: new Date("2026-10-21T10:00:00.000Z"),
      },
    });
  });

  test("no box ticked means the draft scope, never means no expiry", () => {
    const result = parseAgentTokenForm(form({ name: "Laptop", expiry: "never" }), NOW);
    expect(result).toEqual({
      ok: true,
      values: { name: "Laptop", scopes: ["posts:draft"], expiresAt: null },
    });
  });

  test("a blank name, an unknown scope and an unknown expiry are refused", () => {
    expect(parseAgentTokenForm(form({ name: " ", expiry: "never" }), NOW)).toEqual({
      ok: false,
      error: "name",
    });
    expect(
      parseAgentTokenForm(
        form({ name: "x", scopes: ["admin:all"], expiry: "never" }),
        NOW,
      ),
    ).toEqual({ ok: false, error: "scopes" });
    expect(parseAgentTokenForm(form({ name: "x", expiry: "7" }), NOW)).toEqual({
      ok: false,
      error: "expiry",
    });
  });
});
