import { describe, expect, test } from "vitest";

import { ValidateHandleRequest } from "../Requests/ValidateHandleRequest";
import { HandleInvalidResponse } from "../Responses/HandleInvalidResponse";
import { HandleValidResponse } from "../Responses/HandleValidResponse";
import { ValidateHandleHandler } from "./ValidateHandleHandler";

const handler = new ValidateHandleHandler();
const validate = (handle: string) => handler.handle(new ValidateHandleRequest(handle));

describe("ValidateHandleHandler", () => {
  test.each(["ab", "marisol", "june_park", "the-lamplighter-2", "a".repeat(30), "0day"])(
    "accepts %s",
    async (handle) => {
      await expect(validate(handle)).resolves.toBeInstanceOf(HandleValidResponse);
    },
  );

  test.each([
    "",
    "a",
    "Marisol",
    "-lead",
    "_lead",
    "has space",
    "a".repeat(31),
    "émile",
    "a.b",
  ])("refuses the shape of %j", async (handle) => {
    const response = await validate(handle);
    expect(response).toBeInstanceOf(HandleInvalidResponse);
    expect(response).toMatchObject({ reason: "shape" });
  });

  // `p` is reserved too, but one character fails the shape rule first.
  test.each(["anon", "admin", "mod", "api", "auth", "settings"])(
    "refuses the reserved handle %s",
    async (handle) => {
      await expect(validate(handle)).resolves.toMatchObject({ reason: "reserved" });
    },
  );
});
