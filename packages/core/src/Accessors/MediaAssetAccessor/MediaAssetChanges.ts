// The only field ApproveAsMature changes (#11). A missing field is left as it is.
export interface MediaAssetChanges {
  readonly mature?: boolean;
}
