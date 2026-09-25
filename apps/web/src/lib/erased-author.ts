// The proxy sends an erased author's pages to this path, with this request header set,
// so the page can tell a rewrite from a visitor who typed the path (D11).
export const ERASED_AUTHOR_PATH = "/erased-author";
export const ERASED_AUTHOR_HEADER = "x-porchlight-erased-author";
