import { describe, expect, test } from "vitest";

import { DeriveHandleRequest } from "../Requests/DeriveHandleRequest";
import { DeriveHandleHandler } from "./DeriveHandleHandler";

const handler = new DeriveHandleHandler();

async function derive(
  email: string,
  displayName: string | null,
  attempt = 1,
): Promise<string> {
  const response = await handler.handle(
    new DeriveHandleRequest(email, displayName, attempt),
  );
  return response.handle;
}

describe("DeriveHandleHandler", () => {
  test("uses the email's local part, shaped", async () => {
    await expect(derive("Marisol.Vega+porch@example.com", null)).resolves.toBe(
      "marisol-vega-porch",
    );
  });

  test("falls back to the display name when the local part has no usable characters", async () => {
    await expect(derive("日本@example.com", "Jun Park")).resolves.toBe("jun-park");
  });

  test("falls back to 'member' when nothing is usable", async () => {
    await expect(derive("日本@example.com", null)).resolves.toBe("member");
    await expect(derive("x@example.com", "!")).resolves.toBe("member");
  });

  test("later attempts add a numeric suffix", async () => {
    await expect(derive("devon@example.com", null, 2)).resolves.toBe("devon-2");
    await expect(derive("devon@example.com", null, 7)).resolves.toBe("devon-7");
  });

  test("a suffix never pushes the handle past the length limit", async () => {
    const long = "a".repeat(40);

    await expect(derive(`${long}@example.com`, null, 1)).resolves.toHaveLength(30);
    await expect(derive(`${long}@example.com`, null, 12)).resolves.toBe(
      `${"a".repeat(27)}-12`,
    );
  });

  test("reserved candidates are skipped in the sequence", async () => {
    await expect(derive("admin@example.com", null, 1)).resolves.toBe("admin-2");
    await expect(derive("admin@example.com", null, 2)).resolves.toBe("admin-3");
  });

  test("an attempt below one is treated as the first", async () => {
    await expect(derive("devon@example.com", null, 0)).resolves.toBe("devon");
  });
});
