// The file a browser converted a video from (#21), as the browser reports it. Only the
// evidence envelope keeps it; nothing is decided on it.
export interface ConvertedSource {
  readonly filename: string;
  readonly bytes: number;
}
