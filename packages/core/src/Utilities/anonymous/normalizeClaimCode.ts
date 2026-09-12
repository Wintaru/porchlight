// A pasted claim code, as the person typed it, back to the secret text: whitespace and
// the display dashes go, case is folded to the alphabet's. Answers undefined when what
// is left could not be a secret at all, so the caller never hashes an empty string.
const SECRET_SHAPE = /^[A-Z2-7]{16,}$/;

export function normalizeClaimCode(code: string): string | undefined {
  const normalized = code.replace(/[\s-]+/g, "").toUpperCase();
  return SECRET_SHAPE.test(normalized) ? normalized : undefined;
}
