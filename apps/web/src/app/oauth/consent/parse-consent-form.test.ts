import { describe, expect, test } from "vitest";

import { consentPath, parseConsentForm } from "./parse-consent-form";

const ID = "a2v4kq6bgsyarqxbfwdto2zwjjf523xi";

function form(fields: Readonly<Record<string, string | readonly string[]>>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const one of typeof value === "string" ? [value] : value) {
      data.append(name, one);
    }
  }
  return data;
}

describe("parseConsentForm", () => {
  test("an approval carries the ticked scopes on top of the draft floor", () => {
    expect(
      parseConsentForm(
        form({ authorization_id: ID, decision: "approve", scopes: ["posts:publish"] }),
      ),
    ).toEqual({
      ok: true,
      decision: {
        kind: "approve",
        authorizationId: ID,
        scopes: ["posts:draft", "posts:publish"],
      },
    });
  });

  test("a denial needs no scopes", () => {
    expect(parseConsentForm(form({ authorization_id: ID, decision: "deny" }))).toEqual({
      ok: true,
      decision: { kind: "deny", authorizationId: ID },
    });
  });

  test("refuses a missing or odd authorization id, an unknown decision, and an unknown scope", () => {
    expect(parseConsentForm(form({ decision: "approve" }))).toEqual({
      ok: false,
      authorizationId: undefined,
    });
    expect(
      parseConsentForm(form({ authorization_id: "../admin", decision: "approve" })),
    ).toEqual({ ok: false, authorizationId: undefined });
    expect(parseConsentForm(form({ authorization_id: ID, decision: "maybe" }))).toEqual({
      ok: false,
      authorizationId: ID,
    });
    expect(
      parseConsentForm(
        form({ authorization_id: ID, decision: "approve", scopes: ["admin:all"] }),
      ),
    ).toEqual({ ok: false, authorizationId: ID });
  });

  test("never reads a client id from the form", () => {
    const parsed = parseConsentForm(
      form({
        authorization_id: ID,
        decision: "approve",
        client_id: "cc0641ae-b102-45fd-b78e-a4f0ee59a6d7",
      }),
    );
    expect(JSON.stringify(parsed)).not.toContain("cc0641ae");
  });
});

describe("consentPath", () => {
  test("keeps the authorization id and the error in the query", () => {
    expect(consentPath(ID)).toBe(`/oauth/consent?authorization_id=${ID}`);
    expect(consentPath(ID, "expired")).toBe(
      `/oauth/consent?authorization_id=${ID}&error=expired`,
    );
  });
});
