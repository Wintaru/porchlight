// Magic-byte sniffing (SPEC.md §6: "the server checks magic bytes, not extensions").
// Pure and stateless: no domain knowledge of the site's allowlist, just "what does this
// byte layout actually look like." Returns the extension `AttachmentTypeCatalog` uses,
// or undefined when nothing here recognizes the bytes — which is itself the rejection
// for a disguised file (an SVG or HTML renamed to .png sniffs to undefined, since its
// bytes match no signature below).
export function sniffAttachmentExtension(bytes: Uint8Array): string | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, asciiBytes("GIF87a")) || startsWith(bytes, asciiBytes("GIF89a")))
    return "gif";
  if (isRiffContainer(bytes, "WEBP")) return "webp";
  if (isIsobmffBrand(bytes, ["avif", "avis"])) return "avif";
  if (startsWith(bytes, asciiBytes("%PDF-"))) return "pdf";
  if (isZipContainer(bytes)) return sniffZipBasedExtension();
  if (isStlFile(bytes)) return "stl";
  if (looksLikeText(bytes)) return sniffTextExtension(bytes);
  return undefined;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return (
    prefix.length <= bytes.length && prefix.every((byte, index) => bytes[index] === byte)
  );
}

function asciiBytes(text: string): readonly number[] {
  return Array.from(text, (char) => char.charCodeAt(0));
}

function isRiffContainer(bytes: Uint8Array, fourCc: string): boolean {
  return (
    bytes.length >= 12 &&
    startsWith(bytes, asciiBytes("RIFF")) &&
    asciiOf(bytes, 8, 12) === fourCc
  );
}

function isIsobmffBrand(bytes: Uint8Array, brands: readonly string[]): boolean {
  return (
    bytes.length >= 12 &&
    asciiOf(bytes, 4, 8) === "ftyp" &&
    brands.includes(asciiOf(bytes, 8, 12))
  );
}

function asciiOf(bytes: Uint8Array, start: number, end: number): string {
  return Array.from(bytes.slice(start, end), (byte) => String.fromCharCode(byte)).join(
    "",
  );
}

// docx/xlsx/pptx (OOXML) and odt/ods/odp (OpenDocument) are all ZIP containers. The
// container check alone is the anti-spoofing property this issue needs; telling the
// exact subtype apart would mean reading the central directory for a mimetype entry or
// [Content_Types].xml, which no caller of this function needs yet. The claimed
// extension decides which of the six the upload is recorded as, same as today.
function isZipContainer(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
  );
}

const ZIP_BASED_EXTENSIONS = ["docx", "xlsx", "pptx", "odt", "ods", "odp"] as const;

// A ZIP container's true subtype needs its claimed extension to disambiguate (see the
// comment above); the caller matches this back against what was claimed.
function sniffZipBasedExtension(): string {
  return ZIP_BASED_EXTENSIONS[0];
}

// Binary STL has no fixed signature (an 80-byte header of arbitrary bytes), so its shape
// is verified instead: the file must be exactly the header plus the declared triangle
// count's worth of 50-byte records. ASCII STL starts with the literal "solid".
function isStlFile(bytes: Uint8Array): boolean {
  if (startsWith(bytes, asciiBytes("solid"))) return true;
  if (bytes.length < 84) return false;
  const triangleCount = new DataView(bytes.buffer, bytes.byteOffset + 80, 4).getUint32(
    0,
    true,
  );
  return bytes.length === 84 + triangleCount * 50;
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, 8192);
  return sample.every(
    (byte) => byte >= 0x09 && byte !== 0x7f && (byte < 0x80 || byte >= 0xa0),
  );
}

// Plain-text formats share one signature (readable bytes), so their extension turns on
// content, not layout: GPX is XML naming a <gpx> element, and anything else readable is
// accepted as whichever of txt/md/csv the upload claims — this branch cannot tell those
// three apart by content alone, so the caller's claimed extension is the deciding word,
// same as the ZIP-based formats above.
function sniffTextExtension(bytes: Uint8Array): string {
  const text = new TextDecoder().decode(bytes.slice(0, 8192));
  return /<gpx[\s>]/i.test(text) ? "gpx" : "txt";
}

// The claimed extension's own family, for the two families above where a single sniff
// result stands in for several extensions.
export function extensionFamily(extension: string): readonly string[] {
  if ((ZIP_BASED_EXTENSIONS as readonly string[]).includes(extension)) {
    return ZIP_BASED_EXTENSIONS;
  }
  if (extension === "txt" || extension === "md" || extension === "csv") {
    return ["txt", "md", "csv"];
  }
  return [extension];
}
