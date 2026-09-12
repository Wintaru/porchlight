import { describe, expect, test } from "vitest";

import { sniffAttachmentExtension } from "./sniffAttachmentExtension";

function bytes(...values: readonly number[]): Uint8Array {
  return new Uint8Array(values);
}

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("sniffAttachmentExtension", () => {
  test("recognizes a real PNG by its magic bytes", () => {
    expect(
      sniffAttachmentExtension(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0),
      ),
    ).toBe("png");
  });

  test("recognizes a real JPEG", () => {
    expect(sniffAttachmentExtension(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  test("recognizes a real PDF", () => {
    expect(sniffAttachmentExtension(ascii("%PDF-1.7\n..."))).toBe("pdf");
  });

  test("recognizes a ZIP-based container (docx/xlsx/pptx/odt/ods/odp)", () => {
    expect(sniffAttachmentExtension(bytes(0x50, 0x4b, 0x03, 0x04, 0, 0))).toBe("docx");
  });

  test("an SVG renamed to .png sniffs to nothing this catalog recognizes", () => {
    const svg = ascii(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(sniffAttachmentExtension(svg)).not.toBe("png");
    // SVG is plain text, so it falls through to the text branch (txt), never png.
    expect(sniffAttachmentExtension(svg)).toBe("txt");
  });

  test("an HTML file renamed to .png also never sniffs as png", () => {
    const html = ascii("<html><body><script>alert(1)</script></body></html>");
    expect(sniffAttachmentExtension(html)).not.toBe("png");
  });

  test("a GPX file is recognized by its <gpx> element, not its extension", () => {
    const gpx = ascii('<?xml version="1.0"?><gpx version="1.1"><trk></trk></gpx>');
    expect(sniffAttachmentExtension(gpx)).toBe("gpx");
  });

  test("binary noise with no known signature sniffs to undefined", () => {
    expect(sniffAttachmentExtension(bytes(0x01, 0x02, 0x03, 0x04, 0x05))).toBeUndefined();
  });
});
