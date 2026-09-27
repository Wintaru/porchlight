// What the composition root pins on the render engine. `uploadedVideoPrefix` is the
// public address of this site's published media (`<storage origin>/storage/v1/object/
// public/<bucket>/`), so a link to one of its own videos plays in the post (#21). Null
// where no storage is set.
export interface ContentRenderOptions {
  readonly uploadedVideoPrefix: string | null;
}
