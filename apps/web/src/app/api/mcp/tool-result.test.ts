import { PostListRejectedResponse } from "@porchlight/core";
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
});
