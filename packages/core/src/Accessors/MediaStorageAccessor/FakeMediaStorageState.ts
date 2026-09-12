// The fake's "bucket": bytes by `${bucket}/${path}`, so the fake behaves as one shared
// object store the way Supabase Storage's buckets do. `failing` makes every call answer
// MediaStorageAccessFailedResponse, for the error path.
export class FakeMediaStorageState {
  readonly objects = new Map<string, Uint8Array>();

  constructor(readonly failing = false) {}

  key(bucket: string, path: string): string {
    return `${bucket}/${path}`;
  }
}
