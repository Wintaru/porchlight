import { PostListRejectedResponse, PostRejectedResponse } from "@porchlight/core";
import { describe, expect, test } from "vitest";

import { refusalFor } from "./tool-result";

describe("refusalFor", () => {
  // #96: the core refuses an unusable list cap. The agent is told how to fix the call,
  // not that the server is down.
  test("a refused list cap says how to fix the limit", () => {
    const result = refusalFor(new PostListRejectedResponse("c1"), "list_posts");

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "The limit must be a whole number of 1 or more. Fix it and try once more.",
        },
      ],
      isError: true,
    });
  });

  // Another member's image, a non-image and a held image on a published post all come
  // back from the core as one "cover" rejection.
  test("a refused cover says what a cover must be and how to check one", () => {
    const result = refusalFor(new PostRejectedResponse("c1", "cover"), "update_draft");

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("own images that get_media shows as ready");
  });
});
