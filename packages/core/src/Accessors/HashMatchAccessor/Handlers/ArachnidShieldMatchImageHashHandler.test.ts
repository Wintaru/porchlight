import { afterEach, describe, expect, test, vi } from "vitest";

import { MatchImageHashRequest } from "../Requests/MatchImageHashRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";
import { ArachnidShieldMatchImageHashHandler } from "./ArachnidShieldMatchImageHashHandler";

// Shield's answers, shaped as the official SDK documents them. No network: fetch is
// replaced for each test.
const BYTES = new Uint8Array([0xff, 0xd8, 0xff]);
const REQUEST = new MatchImageHashRequest(BYTES, "abc123", "image/jpeg");

function answer(status: number, body: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ArachnidShieldMatchImageHashHandler", () => {
  test("posts the bytes to /v1/media/ with Basic auth and the image's type", async () => {
    const fetchMock = answer(200, { classification: "no-known-match" });

    await new ArachnidShieldMatchImageHashHandler("porch-user:s3cret").handle(REQUEST);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://shield.projectarachnid.ca/v1/media/");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: `Basic ${btoa("porch-user:s3cret")}`,
      "content-type": "image/jpeg",
    });
    expect(init.body).toEqual(BYTES);
  });

  test.each([
    ["no-known-match", false],
    ["csam", true],
    ["harmful-abusive-material", true],
    // A classification Shield adds later holds the item: caution, not a pass.
    ["some-new-category", true],
  ])("classification %s means matched = %s", async (classification, matched) => {
    answer(200, { classification, sha256_hex: "ABC", is_match: false });

    const response = await new ArachnidShieldMatchImageHashHandler("u:p").handle(REQUEST);

    expect(response).toBeInstanceOf(HashMatchResultResponse);
    expect(response).toMatchObject({ matched });
  });

  test("a refused request, an unknown body or a null classification is a failure, never a pass", async () => {
    const handler = new ArachnidShieldMatchImageHashHandler("u:p");
    answer(401, { detail: "Invalid username/password." });
    const refused = await handler.handle(REQUEST);
    answer(200, { matched: false });
    const unknown = await handler.handle(REQUEST);
    answer(200, { classification: null });
    const unclassified = await handler.handle(REQUEST);

    expect(refused).toBeInstanceOf(HashMatchAccessFailedResponse);
    expect(unknown).toBeInstanceOf(HashMatchAccessFailedResponse);
    expect(unclassified).toBeInstanceOf(HashMatchAccessFailedResponse);
  });

  test("a password outside ASCII is sent as UTF-8", async () => {
    const fetchMock = answer(200, { classification: "no-known-match" });

    await new ArachnidShieldMatchImageHashHandler("usér:pässword").handle(REQUEST);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const utf8 = String.fromCharCode(...new TextEncoder().encode("usér:pässword"));
    expect(init.headers).toMatchObject({ authorization: `Basic ${btoa(utf8)}` });
  });
});
