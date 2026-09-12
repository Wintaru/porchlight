import { describe, expect, test } from "vitest";

import { ClassifyAttachmentRequest } from "../Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../Responses/AttachmentRejectedResponse";
import { ClassifyAttachmentHandler } from "./ClassifyAttachmentHandler";

const ALLOWLIST = ["png", "jpeg", "pdf", "docx"];

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

describe("ClassifyAttachmentHandler", () => {
  test("a real PNG claimed as .png is classified as an image", async () => {
    const handler = new ClassifyAttachmentHandler();

    const result = await handler.handle(
      new ClassifyAttachmentRequest("porch.png", PNG_BYTES, ALLOWLIST),
    );

    expect(result).toBeInstanceOf(AttachmentClassifiedResponse);
    expect(result).toMatchObject({
      extension: "png",
      kind: "image",
      mimeType: "image/png",
    });
  });

  test("an SVG renamed to .png is rejected: its bytes never sniff to png", async () => {
    const handler = new ClassifyAttachmentHandler();
    const svg = ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    const result = await handler.handle(
      new ClassifyAttachmentRequest("porch.png", svg, ALLOWLIST),
    );

    expect(result).toBeInstanceOf(AttachmentRejectedResponse);
    expect(result).toMatchObject({ reason: "type-mismatch" });
  });

  test("a real PNG claimed with a disallowed extension is rejected", async () => {
    const handler = new ClassifyAttachmentHandler();

    const result = await handler.handle(
      new ClassifyAttachmentRequest("porch.svg", PNG_BYTES, ALLOWLIST),
    );

    expect(result).toMatchObject({ reason: "extension-not-allowed" });
  });

  test("a filename with no extension is rejected", async () => {
    const handler = new ClassifyAttachmentHandler();

    const result = await handler.handle(
      new ClassifyAttachmentRequest("porch", PNG_BYTES, ALLOWLIST),
    );

    expect(result).toMatchObject({ reason: "extension-not-allowed" });
  });

  test("a PDF claimed as .docx is rejected: both are recognized, but not as each other", async () => {
    const handler = new ClassifyAttachmentHandler();
    const pdf = ascii("%PDF-1.7\n...");

    const result = await handler.handle(
      new ClassifyAttachmentRequest("report.docx", pdf, ALLOWLIST),
    );

    expect(result).toMatchObject({ reason: "type-mismatch" });
  });
});
