// heic-decode ships no types. Only the calls decodeHeic.ts makes.
declare module "heic-decode" {
  interface DecodedHeic {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8ClampedArray;
  }
  interface HeicImage {
    readonly width: number;
    readonly height: number;
    decode(): Promise<DecodedHeic>;
  }
  interface HeicImages extends ReadonlyArray<HeicImage> {
    dispose(): void;
  }
  interface HeicDecode {
    (input: { buffer: Uint8Array }): Promise<DecodedHeic>;
    all(input: { buffer: Uint8Array }): Promise<HeicImages>;
  }
  const decode: HeicDecode;
  export default decode;
}
