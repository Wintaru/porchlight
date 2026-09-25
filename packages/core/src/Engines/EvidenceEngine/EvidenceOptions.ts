// The salt for the address hash: the same EVIDENCE_IP_HASH_SALT the upload envelope and
// the anonymous guard use, so one address hashes the same everywhere.
export interface EvidenceOptions {
  readonly ipHashSalt: string;
}
