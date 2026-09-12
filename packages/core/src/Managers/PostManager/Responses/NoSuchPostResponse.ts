import { ResponseBase } from "../../../Common/ResponseBase";

// No post matches, or one does and this actor may not know it. The Client answers 404.
export class NoSuchPostResponse extends ResponseBase {}
