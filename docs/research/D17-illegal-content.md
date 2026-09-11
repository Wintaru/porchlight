# D17 research — illegal and violent content protections

Checked 2026-09-11 against vendor docs, regulator sites and statutes. This is research,
not legal advice. A self-hoster in any region should confirm their duties with a lawyer.

## 1. CSAM hash matching before a human sees an upload

| Option | Cost | How to get it | Runs before approval? | Files the report for you? |
| --- | --- | --- | --- | --- |
| [Cloudflare CSAM Scanning Tool](https://developers.cloudflare.com/cache/reference/csam-scanning/) | Free, every plan | Verified notification email only ([since Feb 2025](https://developers.cloudflare.com/changelog/post/2025-02-04-easier-onboarding-for-csam-scanning-tool/)) | No — scans content that passes through the Cloudflare cache, so after upload, when served | No — [operators still file their own reports](https://blog.cloudflare.com/a-simpler-path-to-a-safer-internet-an-update-to-our-csam-scanning-tool/) |
| [Shield by Project Arachnid](https://projectarachnid.com/en/best-practices/) (Canadian Centre for Child Protection) | Free | Application as a service provider ([API docs](https://shield.projectarachnid.com/docs/)) | Yes — API, MD5 plus perceptual hash | No |
| [Microsoft PhotoDNA Cloud Service](https://www.microsoft.com/en-us/photodna/cloudservice) | Free for qualified customers | Third-party vetting, not guaranteed for a hobby site | Yes — REST API | No |
| [Google Content Safety API](https://protectingchildren.google/tools-for-partners/) | Free for approved partners | Approval | Yes | No |
| [Thorn Safer](https://aws.amazon.com/marketplace/pp/prodview-dfwekn4bx4ake) | From $30,720 per year | Contract | Yes | No |
| [IWF hash list](https://www.iwf.org.uk/our-technology/our-services/image-hash-list/) (UK) | [£5,000+ per year](https://www.iwf.org.uk/membership/fees/) | Membership | Yes | No |
| [Hive CSAM Detection](https://thehive.ai/apis/csam-detection) | Sales-led | Contract | Yes | [Yes, from its dashboard](https://docs.thehive.ai/docs/report-to-ncmec) |
| [Hasher-Matcher-Actioner](https://github.com/facebook/ThreatExchange/tree/main/hasher-matcher-actioner) (Meta, open source, PDQ) | Free | Self-host | Yes | No |

The blocker for the open-source route: **no vetted CSAM hash list is publicly downloadable.**
A small site cannot obtain one without an agreement (NCMEC, IWF, PhotoDNA, Arachnid).
[IFTAS](https://about.iftas.org/library/csam-detection/) lists Arachnid Shield, PhotoDNA,
IWF Image Intercept and Offlimits as the free-but-agreement-gated options.

## 2. Classifiers for violence, gore, sexual content, self-harm

| Service | Price | Free tier | Returns |
| --- | --- | --- | --- |
| [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation) (`omni-moderation-latest`) | Free | Free | `flagged`, per-category booleans, scores. Text and image. `sexual/minors` is text-only. |
| [AWS Rekognition](https://aws.amazon.com/rekognition/pricing/) DetectModerationLabels | $0.001 per image | 1,000 per month for 12 months | Label plus confidence |
| [Google Vision SafeSearch](https://cloud.google.com/vision/pricing) | $1.50 per 1,000 | 1,000 per month | Five likelihood buckets |
| [Sightengine](https://sightengine.com/pricing) | $29 per month for 10k ops | 2,000 per month, 500 per day | Per-model probability, has [self-harm](https://sightengine.com/docs/self-harm-detection-model), gore, nudity, text |
| [Hive](https://thehive.ai/pricing) | $3 per 1,000 visual, $0.50 per 1,000 text | $50 credits after a card | Class plus score, has self-harm, gore, child presence |
| [Claude as classifier](https://platform.claude.com/docs/en/about-claude/pricing) | Haiku 4.5 $1/$5 per MTok | Trial credits | Whatever schema you prompt for. Not a purpose-built moderation model. |

## 3. Legal duties by region for a small site with user uploads

| Region | Statute | Report to | Deadline | Preserve | Contact or transparency | Small site exempt? |
| --- | --- | --- | --- | --- | --- | --- |
| United States | [18 U.S.C. §2258A](https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title18-section2258A&num=0&edition=prelim) (REPORT Act 2024) | NCMEC CyberTipline | As soon as reasonably possible after actual knowledge | 1 year | None | **No** — any provider, no size floor. No duty to scan. Willful failure: up to $600k–$850k. |
| European Union | DSA (Reg. 2022/2065) | Law enforcement for threats to life or safety ([Art 18](https://www.cms-digitallaws.com/en/dsa/article-18/)); CSAM per national law | Promptly | Per national law | Points of contact ([Arts 11–12](https://www.cms-digitallaws.com/en/dsa/article-16/)), notice-and-action (Art 16), statements of reasons (Art 17) | **Partly** — micro and small enterprises skip transparency reports and the platform section ([Art 19](https://www.cms-digitallaws.com/en/dsa/article-19/)). EU-wide CSAM reporting mandate [still in trilogue](https://www.europarl.europa.eu/legislative-train/spotlight-JD22/file-combating-child-sexual-abuse-online), interim voluntary-scanning derogation in force since 1 Aug 2026. |
| United Kingdom | Online Safety Act 2023, [Ofcom illegal harms codes](https://www.ofcom.org.uk/siteassets/resources/documents/online-safety/information-for-industry/illegal-harms/summary-of-our-decisions.pdf?v=387523) | NCA portal, or NCMEC counts ([SI 2026/268](https://www.legislation.gov.uk/uksi/2026/268/made), mandatory since 7 Apr 2026) | Priority 1 immediately, 2 as soon as practicable, 3 without undue delay | 1 year content, 5 years reference | Illegal-content risk assessment, moderation function, complaints process, named accountable person, annual review | **No** — all user-to-user services. Hash matching is a code measure for file-sharing services at high CSAM risk regardless of size. |
| Canada | [Mandatory Reporting Act](https://laws-lois.justice.gc.ca/eng/acts/I-20.7/FullText.html) (S.C. 2011, c. 4) | Cybertip.ca, and police on reasonable grounds | As soon as feasible | 21 days ([Bill C-16](https://www.osler.com/en/insights/updates/bill-c-16-federal-child-sexual-abuse-exploitation-material-reporting-regime/), not yet in force, extends to 1 year) | None | **No** — fines $1,000 (individual) to $100,000 (corporation). No duty to seek out. |
| Australia | Online Safety Act 2021, [BOSE](https://www.esafety.gov.au/industry/basic-online-safety-expectations), [DIS Class 1A/1B Standard](https://www.allens.com.au/insights-news/insights/2025/02/new-industry-standards-for-online-safety-what-service-providers-need-to-know/) | Law enforcement for serious immediate threats; eSafety [about 24 hours](https://www.esafety.gov.au/sites/default/files/2026-05/OnlineSafetyCodesandStandardsRegulatoryGuidance-April2026.pdf?v=1780995600026) for Class 1A | 24 hours | Records required | Risk assessment, complaints, records | **No** — obligations scale with risk tier, penalties up to A$49.5M. |

## 4. Moderator wellbeing

[TSPA](https://www.tspa.org/curriculum/ts-fundamentals/content-moderation-and-operations/setting-up-a-content-moderator-for-success/)
recommends: blur by default, an option to view in grayscale, thumbnails to limit exposure
time, structured training before exposure, and a documented violation hierarchy.
[Research (HCOMP 2020)](https://ojs.aaai.org/index.php/HCOMP/article/view/7461) shows
grayscale keeps accuracy while it improves affect, and hover-or-click unblur beats static blur.

## 4b. Can a general LLM (Claude, OpenAI chat) be the classifier?

For **text**, yes. Anthropic publishes a
[content moderation guide](https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation)
with categories, risk levels and JSON output. Its caveat: built-in safety training may flag
content regardless of the prompt, so it over-flags rather than under-flags. That suits a
maximum-caution site.

For **images that might be CSAM**, no. The [Usage Policy](https://www.anthropic.com/legal/aup)
forbids creating or distributing CSAM and has no moderation carve-out. Sending a suspected
image to a general AI vendor is itself a transmission of the material to a party with no
legal standing to receive it. The purpose-built vendors (Arachnid, PhotoDNA, Hive, Thorn,
Google Content Safety) exist because they have the agreements and the legal footing to
receive it. Hive's CSAM product also files the NCMEC report from its dashboard.

Pipeline order that follows from this: hash match → purpose-built image classifier → general
classifier. A hit at either of the first two stages locks the item and it goes nowhere else.

## 5. What this means for a small, self-hosted, maximum-caution site

- **Every upload is quarantined** until scanned and approved. Nothing is served before that.
- **Two layers:** a hash-match provider slot (Arachnid Shield as the free default, PhotoDNA
  and Cloudflare as alternates) and a classifier slot (OpenAI Moderation free, plus one paid
  image classifier). Both behind one accessor each, both replaceable.
- **Hold, never delete.** A flagged item is held and blurred. A high-confidence hit in the
  worst categories is **locked**: frozen, hashed, audit-logged, and cannot be deleted before
  the retention clock ends. Deleting evidence is itself a violation in most regions.
- **Region setting** picks the reporting target, the deadline, and the retention length. The
  1-year retention, the audit log, and the never-disable-scanning rule stay global, because
  no region penalises caution.
- **Queue UI:** blurred and grayscale by default, click to reveal, an exposure counter, and
  an "escalate and lock" button.
