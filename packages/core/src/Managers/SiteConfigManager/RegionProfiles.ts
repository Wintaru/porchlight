import { DEFAULT_RAW_IP_RETENTION_DAYS } from "../../Common/Retention";
import type { Region } from "../../Common/Region";

// What a region wires (SPEC.md §7): a reporting target and contact for illegal content,
// deadline guidance, and the raw-IP retention window (the same "IP window" the spec
// names, and the value #10 reads as `site_config.raw_ip_retention_days`). These are
// starting defaults for a well-known reporting body, not legal advice — the settings
// page says so next to every region, and "other" carries a plain warning besides.
export interface RegionProfile {
  readonly reportingTarget: string;
  readonly reportingContact: string;
  readonly deadlineText: string;
  readonly ipWindowDays: number;
  readonly warning: string | null;
}

export const REGION_PROFILES: Readonly<Record<Region, RegionProfile>> = {
  US: {
    reportingTarget: "NCMEC CyberTipline",
    reportingContact: "https://report.cybertip.org",
    deadlineText:
      "Report apparent child sexual abuse material as soon as reasonably possible, as federal law requires.",
    ipWindowDays: DEFAULT_RAW_IP_RETENTION_DAYS,
    warning: null,
  },
  EU: {
    reportingTarget: "your national hotline, listed by INHOPE",
    reportingContact: "https://www.inhope.org/EN/hotlines",
    deadlineText:
      "Act on a validated removal order promptly, as the Digital Services Act requires.",
    ipWindowDays: DEFAULT_RAW_IP_RETENTION_DAYS,
    warning: null,
  },
  UK: {
    reportingTarget: "the Internet Watch Foundation",
    reportingContact: "https://report.iwf.org.uk",
    deadlineText:
      "Act on a validated removal notice without delay, as the Online Safety Act requires.",
    ipWindowDays: DEFAULT_RAW_IP_RETENTION_DAYS,
    warning: null,
  },
  CA: {
    reportingTarget: "Cybertip.ca",
    reportingContact: "https://www.cybertip.ca",
    deadlineText: "Report and remove flagged content as soon as reasonably possible.",
    ipWindowDays: DEFAULT_RAW_IP_RETENTION_DAYS,
    warning: null,
  },
  AU: {
    reportingTarget: "the eSafety Commissioner",
    reportingContact: "https://www.esafety.gov.au/report",
    deadlineText: "Comply with a removal notice within the stated timeframe.",
    ipWindowDays: DEFAULT_RAW_IP_RETENTION_DAYS,
    warning: null,
  },
  other: {
    reportingTarget: "no default authority configured",
    reportingContact: "set this from local legal guidance",
    deadlineText: "no default guidance for this choice",
    ipWindowDays: DEFAULT_RAW_IP_RETENTION_DAYS,
    warning:
      "This region has no built-in reporting guidance. Consult local law for reporting duties and retention limits, and set the values above by hand.",
  },
};
