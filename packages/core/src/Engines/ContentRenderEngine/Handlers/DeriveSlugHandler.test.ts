import { describe, expect, test } from "vitest";

import { DeriveSlugRequest } from "../Requests/DeriveSlugRequest";
import { SlugDerivedResponse } from "../Responses/SlugDerivedResponse";
import { SlugUnusableResponse } from "../Responses/SlugUnusableResponse";
import { hasSlugShape, SLUG_MAX_LENGTH } from "../SlugShape";
import { DeriveSlugHandler } from "./DeriveSlugHandler";

const handler = new DeriveSlugHandler();

async function derive(title: string, attempt = 1): Promise<string> {
  const response = await handler.handle(new DeriveSlugRequest(title, attempt));
  if (!(response instanceof SlugDerivedResponse)) {
    throw new Error(`expected SlugDerivedResponse, got ${response.constructor.name}`);
  }
  return response.slug;
}

describe("DeriveSlugHandler", () => {
  test("lowercases, joins words with one dash, and drops punctuation", async () => {
    await expect(derive("The Cedar Planter Box, and the Raccoons!")).resolves.toBe(
      "the-cedar-planter-box-and-the-raccoons",
    );
    await expect(derive("  spaced   out  ")).resolves.toBe("spaced-out");
    await expect(derive("Hello from the porch")).resolves.toBe("hello-from-the-porch");
  });

  test("strips accents and keeps digits", async () => {
    await expect(derive("Café à 3 heures")).resolves.toBe("cafe-a-3-heures");
  });

  test("a title with nothing usable is SlugUnusable", async () => {
    for (const title of ["", "   ", "!!!", "日本語"]) {
      await expect(
        handler.handle(new DeriveSlugRequest(title, 1)),
      ).resolves.toBeInstanceOf(SlugUnusableResponse);
    }
  });

  test("later attempts carry a numeric suffix", async () => {
    await expect(derive("Hello", 2)).resolves.toBe("hello-2");
    await expect(derive("Hello", 10)).resolves.toBe("hello-10");
  });

  test("a long title is cut at a word boundary and stays in shape with a suffix", async () => {
    const title = Array.from({ length: 30 }, (_, i) => `word${String(i)}`).join(" ");
    const plain = await derive(title);
    const suffixed = await derive(title, 12);
    expect(plain.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(plain.endsWith("-")).toBe(false);
    expect(hasSlugShape(plain)).toBe(true);
    expect(suffixed.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(suffixed.endsWith("-12")).toBe(true);
    expect(hasSlugShape(suffixed)).toBe(true);
  });
});
