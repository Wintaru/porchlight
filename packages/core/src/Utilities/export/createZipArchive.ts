import JSZip from "jszip";

// Bundles named files into one ZIP archive, in memory. Domain-agnostic: a caller decides
// what belongs in the archive (SPEC.md §10's export bundle), this only packs it.
export async function createZipArchive(
  files: ReadonlyMap<string, string>,
): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of files) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "uint8array" });
}
