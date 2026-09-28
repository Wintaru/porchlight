import { ResponseBase } from "../../../Common/ResponseBase";

// A save named the version it last saw, and the post has been written since: in another
// tab, by an agent, or by a newer Save this late request lost to (#100). Nothing was
// written. The editor says so and keeps the author's text on the page.
export class PostChangedResponse extends ResponseBase {}
