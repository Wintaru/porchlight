// The fake's "bucket": bytes by `${bucket}/${path}`, so the fake behaves as one shared
// object store the way Supabase Storage's buckets do. `contentTypes` holds the type an
// object was stored with, where a test or an upload set one. `failing` makes every call
// answer MediaStorageAccessFailedResponse, for the error path.
export class FakeMediaStorageState {
  readonly objects = new Map<string, Uint8Array>();
  readonly contentTypes = new Map<string, string>();

  constructor(readonly failing = false) {}

  key(bucket: string, path: string): string {
    return `${bucket}/${path}`;
  }
}
