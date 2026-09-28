// The longest post body in characters (#94, C19). The editor, the anonymous form and
// the MCP tools refuse a longer one at their edge; the PostManager refuses it again, so
// a caller that skips its edge check still cannot store one. The draft check reads no
// more than this either.
export const POST_BODY_MAX_LENGTH = 100_000;
