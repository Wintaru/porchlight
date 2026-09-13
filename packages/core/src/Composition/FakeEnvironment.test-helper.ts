import type { Environment } from "./Environment";

// The smallest environment that builds a container with no external store: every
// provider that would need a key selects its fake.
export const FAKE_ENV: Environment = {
  PROFILE_PROVIDER: "fake",
  POST_PROVIDER: "fake",
  COMMENT_PROVIDER: "fake",
  REACTION_PROVIDER: "fake",
  SITE_CONFIG_PROVIDER: "fake",
  ANONYMOUS_AUTHOR_PROVIDER: "fake",
  BLOCK_PROVIDER: "fake",
  RATE_LIMIT_PROVIDER: "fake",
  MEDIA_PROVIDER: "fake",
  MEDIA_STORAGE_PROVIDER: "fake",
  QUOTA_PROVIDER: "fake",
  REPORT_PROVIDER: "fake",
  MOD_ACTION_PROVIDER: "fake",
  AUDIT_PROVIDER: "fake",
  NOTIFICATION_PROVIDER: "fake",
  // Required unconditionally by createAnonymousGuardEngine, even with every store faked.
  EVIDENCE_IP_HASH_SALT: "test-salt",
};
