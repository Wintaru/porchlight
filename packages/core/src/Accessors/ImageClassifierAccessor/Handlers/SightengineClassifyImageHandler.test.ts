import { afterEach, describe, expect, test, vi } from "vitest";

import { ClassifyImageRequest } from "../Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import { ImageClassifierAccessFailedResponse } from "../Responses/ImageClassifierAccessFailedResponse";
import { SightengineClassifyImageHandler } from "./SightengineClassifyImageHandler";

// Sightengine's answers, shaped as a live response on 2026-09-27. No network: fetch is
// replaced for each test.
const REQUEST = new ClassifyImageRequest(
  new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  "image/png",
);

function answer(status: number, body: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

interface Scores {
  readonly sexualDisplay?: number;
  readonly erotica?: number;
  readonly verySuggestive?: number;
  readonly minors?: readonly number[];
}

function scores({
  sexualDisplay = 0.001,
  erotica = 0.001,
  verySuggestive = 0.001,
  minors = [],
}: Scores) {
  return {
    status: "success",
    nudity: {
      sexual_activity: 0.001,
      sexual_display: sexualDisplay,
      erotica,
      very_suggestive: verySuggestive,
    },
    violence: { prob: 0.001 },
    gore: { prob: 0.001 },
    "self-harm": { prob: 0.001 },
    offensive: { prob: 0.001 },
    faces: minors.map((minor) => ({ attributes: { age: { minor } } })),
  };
}

async function failed(): Promise<boolean> {
  const response = await new SightengineClassifyImageHandler("user", "secret").handle(
    REQUEST,
  );
  return response instanceof ImageClassifierAccessFailedResponse;
}

async function classify() {
  const response = await new SightengineClassifyImageHandler("user", "secret").handle(
    REQUEST,
  );
  if (!(response instanceof ImageClassifiedResponse)) {
    throw new Error(`unexpected ${response.constructor.name}`);
  }
  return response.classification;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SightengineClassifyImageHandler", () => {
  test("asks for every model the policy reads, face-age included", async () => {
    const fetchMock = answer(200, scores({}));

    await classify();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.sightengine.com/1.0/check.json");
    const form = init.body as FormData;
    expect(form.get("models")).toBe(
      "nudity-2.1,violence,gore,self-harm,offensive,face-age",
    );
    expect(form.get("api_user")).toBe("user");
  });

  test.each([
    ["sexual display", { sexualDisplay: 0.7 }, 0.7],
    ["erotica alone", { erotica: 0.95 }, 0.95],
  ])(
    "the severity score is the highest category: %s",
    async (_label, input, expected) => {
      answer(200, scores(input));
      expect((await classify()).severityScore).toBe(expected);
    },
  );

  test.each([
    {
      label: "a child's face with sexual display",
      input: { sexualDisplay: 0.3, minors: [0.9] },
      expected: true,
    },
    {
      label: "a child's face with erotica",
      input: { erotica: 0.3, minors: [0.9] },
      expected: true,
    },
    {
      label: "a child's face, very suggestive",
      input: { verySuggestive: 0.3, minors: [0.9] },
      expected: true,
    },
    {
      label: "both bars exactly met",
      input: { sexualDisplay: 0.2, minors: [0.5] },
      expected: true,
    },
    {
      label: "the face just under its bar",
      input: { sexualDisplay: 0.9, minors: [0.49] },
      expected: false,
    },
    {
      label: "the sexual score just under its bar",
      input: { sexualDisplay: 0.19, minors: [0.9] },
      expected: false,
    },
    {
      label: "an adult and a child, sexual content",
      input: { sexualDisplay: 0.3, minors: [0.01, 0.8] },
      expected: true,
    },
    {
      label: "a child's face alone (a family photo)",
      input: { minors: [0.9] },
      expected: false,
    },
    {
      label: "an adult's face with sexual content",
      input: { sexualDisplay: 0.9, minors: [0.01] },
      expected: false,
    },
    { label: "no face", input: { sexualDisplay: 0.9 }, expected: false },
  ])("$label: minors signal $expected", async ({ input, expected }) => {
    answer(200, scores(input));
    expect((await classify()).minorsSignal).toBe(expected);
  });

  test.each([
    ["a 400 failure", 400, { status: "failure", error: { message: "Unknown model" } }],
    ["a 200 failure", 200, { status: "failure", error: { message: "odd" } }],
    ["no nudity block", 200, { ...scores({}), nudity: undefined }],
    ["no faces array", 200, { ...scores({}), faces: undefined }],
    ["a face with no age", 200, { ...scores({}), faces: [{ attributes: {} }] }],
    ["a score that is not a number", 200, { ...scores({}), gore: { prob: "0.9" } }],
    ["a score above 1", 200, { ...scores({}), violence: { prob: 7 } }],
    ["a body that is not an object", 200, 42],
  ])("%s fails the upload instead of scoring it clear", async (_label, status, body) => {
    answer(status, body);
    expect(await failed()).toBe(true);
  });
});
