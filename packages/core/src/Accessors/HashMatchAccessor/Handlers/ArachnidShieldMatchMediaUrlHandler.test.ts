import { afterEach, describe, expect, test, vi } from "vitest";

import { MatchMediaUrlRequest } from "../Requests/MatchMediaUrlRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";
import { ArachnidShieldMatchMediaUrlHandler } from "./ArachnidShieldMatchMediaUrlHandler";

// No network: fetch answers first as the storage host, then as Shield.
const SIGNED_URL = "https://storage.example.test/object/sign/quarantine/clip.mp4?token=t";
const VIDEO = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]);
const REQUEST = new MatchMediaUrlRequest(SIGNED_URL);

function video(status = 200): Response {
  return new Response(status === 200 ? VIDEO : null, {
    status,
    headers:
      status === 200
        ? { "content-type": "video/mp4", "content-length": String(VIDEO.length) }
        : {},
  });
}

function answers(...responses: readonly Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function shield(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ArachnidShieldMatchMediaUrlHandler", () => {
  test("streams the video from the signed link to /v1/media/ with its length", async () => {
    const fetchMock = answers(video(), shield(200, { classification: "no-known-match" }));

    const result = await new ArachnidShieldMatchMediaUrlHandler(
      "porch-user:s3cret",
    ).handle(REQUEST);

    expect(result).toBeInstanceOf(HashMatchResultResponse);
    expect((result as HashMatchResultResponse).matched).toBe(false);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(SIGNED_URL);
    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(url).toBe("https://shield.projectarachnid.com/v1/media/");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      authorization: `Basic ${btoa("porch-user:s3cret")}`,
      "content-type": "video/mp4",
      "content-length": String(VIDEO.length),
    });
    expect(init?.body).toBeInstanceOf(ReadableStream);
  });

  test("a match is a match", async () => {
    answers(video(), shield(200, { classification: "csam" }));

    const result = await new ArachnidShieldMatchMediaUrlHandler("u:p").handle(REQUEST);

    expect((result as HashMatchResultResponse).matched).toBe(true);
  });

  test("a video the storage host will not serve fails without calling Shield", async () => {
    const fetchMock = answers(video(404));

    const result = await new ArachnidShieldMatchMediaUrlHandler("u:p").handle(REQUEST);

    expect(result).toBeInstanceOf(HashMatchAccessFailedResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a Shield error is a failed scan, never a pass", async () => {
    answers(video(), shield(403, { detail: "forbidden" }));

    const result = await new ArachnidShieldMatchMediaUrlHandler("u:p").handle(REQUEST);

    expect(result).toBeInstanceOf(HashMatchAccessFailedResponse);
    expect((result as HashMatchAccessFailedResponse).reason).toBe("Shield answered 403");
  });

  test("a video served with no length fails without calling Shield", async () => {
    const fetchMock = answers(new Response(VIDEO, { status: 200 }));

    const result = await new ArachnidShieldMatchMediaUrlHandler("u:p").handle(REQUEST);

    expect(result).toBeInstanceOf(HashMatchAccessFailedResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a Shield call that throws is a failed scan that names no link", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValueOnce(video());
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new ArachnidShieldMatchMediaUrlHandler("u:p").handle(REQUEST);

    expect(result).toBeInstanceOf(HashMatchAccessFailedResponse);
    expect((result as HashMatchAccessFailedResponse).reason).not.toContain("token=");
  });
});
