// What a later step changes on an upload: ApproveAsMature's tag (#11), the path of the
// published copy once one exists (#36), and the post it was uploaded for (#80). A
// missing field is left as it is. `postId` is set only on an upload that has no post
// yet: a store that finds one already set answers MediaAssetNotFoundResponse, so a save
// that linked it first keeps it.
export interface MediaAssetChanges {
  readonly mature?: boolean;
  readonly publishedPath?: string;
  readonly postId?: string;
}
