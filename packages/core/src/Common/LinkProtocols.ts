// The URL schemes a link in a body may use. One list for the sanitizer, which strips
// every other `href`, and the editor's Link extension, which refuses them at the
// keyboard, so the two cannot disagree. Images take http(s) only (HTML_ALLOWLIST).
export const LINK_PROTOCOLS = ["http", "https", "mailto"] as const;
