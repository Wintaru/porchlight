// What the subject has already used, loaded by the Manager before it asks this Engine
// to rule (a member from `quotas`, an anonymous author by counting their own
// `media_assets` rows) so the Engine itself stays pure and needs no Accessor.
export interface QuotaUsage {
  readonly bytesUsed: number;
  readonly filesCount: number;
}
