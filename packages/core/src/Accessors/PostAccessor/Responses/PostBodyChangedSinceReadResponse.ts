import { ResponseBase } from "../../../Common/ResponseBase";

// No row matched the store: the post was saved (or removed) after the re-render read
// it, so its markdown is no longer the one the new HTML came from (#98). Nothing was
// written, and the save's own HTML stays.
export class PostBodyChangedSinceReadResponse extends ResponseBase {}
