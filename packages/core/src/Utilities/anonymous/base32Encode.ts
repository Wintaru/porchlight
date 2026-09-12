// RFC 4648 base32 without padding: 5 bits per character, A–Z then 2–7. Chosen for the
// claim code because the alphabet has no ambiguous 0/O and 1/I pairs and reads aloud.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET.charAt((value << (5 - bits)) & 31);
  }
  return out;
}
