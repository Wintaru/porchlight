// What a later step changes on an upload: ApproveAsMature's tag (#11), and the path of
// the published copy once one exists (#36). A missing field is left as it is.
export interface MediaAssetChanges {
  readonly mature?: boolean;
  readonly publishedPath?: string;
}
