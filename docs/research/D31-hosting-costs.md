# D31 research — hosting costs and a Docker self-host

Checked 2026-10-02 against vendor pricing pages and docs. Prices change. Check them again
before a decision depends on them.

## 1. The hosted setup today

| Part | Plan | Cost | Why this plan |
| --- | --- | --- | --- |
| [Supabase](https://supabase.com/pricing) | Pro | $25 each month, with $10 of compute credit (one Micro instance, 1 GB RAM) | The free plan takes uploads of 50 MB at most, and a 250 MiB video needs more. Free projects also pause after one week with no activity. |
| [Vercel](https://vercel.com/docs/plans/hobby) | Hobby | Free | Hobby is for non-commercial personal use only. Pro is $20 for each user each month. |

Pro includes 8 GB of database disk, 100 GB of file storage, 250 GB of egress, and daily
backups kept for 7 days. The hourly digest job does not need Vercel Pro: `pg_cron` and
`pg_net` call the route, and Vercel Cron does not
([Hobby cron runs once a day at most](https://vercel.com/docs/cron-jobs/usage-and-pricing)).

## 2. Self-hosted Supabase

- **Machine:** 4 GB RAM, 2 cores and 40 GB SSD at minimum. 8 GB RAM, 4 cores and 80 GB
  SSD are recommended ([self-hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker)).
- **Services:** Studio, a gateway, Auth, PostgREST, Realtime, Storage, imgproxy,
  postgres-meta, Postgres, Edge Runtime, Logflare, Vector and Supavisor. `pg_cron` and
  `pg_net` are in the Postgres image ([supabase/postgres](https://github.com/supabase/postgres)).
- **Not included:** managed backups, point-in-time recovery, branching, advanced metrics
  and the Management API ([self-hosting overview](https://supabase.com/docs/guides/self-hosting)).
  The operator owns backups, updates and monitoring.
- **OAuth 2.1 server (D25):** in beta on every hosted plan
  ([docs](https://supabase.com/docs/guides/auth/oauth-server/getting-started)). Third-party
  guides say the open-source Auth image has it behind `GOTRUE_OAUTH_SERVER_ENABLED=true`.
  No official self-host page confirms this. Test it before the guide promises agent
  connectors on a self-host.

## 3. Next.js in Docker

The official Docker template uses `output: "standalone"`. Image optimization, Proxy, ISR,
`after` and streaming all work under `next start`
([self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting)). With more than one
instance, the cache needs a shared `cacheHandler`, and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
and `deploymentId` must be the same on each instance. A reverse proxy must not buffer
streamed responses.

## 4. Machines to run it on

| Provider | 4 GB RAM | 8 GB RAM | Note |
| --- | --- | --- | --- |
| Hetzner Cloud (EU, no VAT) | CX23 €5.49 | CX33 €8.49, CAX21 (ARM) €10.49 | From a [third-party price list](https://costgoat.com/pricing/hetzner) dated 2026-09-05. Hetzner raised prices on 2026-06-15, and the low-cost plans were reported unavailable to order in September 2026. |
| [DigitalOcean](https://www.digitalocean.com/pricing/droplets) | $24 | $48 | Basic droplets. |

Hosts that run one container, for the web app alone: [Fly.io](https://docs.fly.io/about/pricing)
about $4.64 each month at 1 GB, [Railway](https://railway.com/pricing) Hobby $5 each month
plus usage, Render Starter $7 each month.

## 5. What this means

The whole stack on one 8 GB machine costs about €8.50 to €10.50 at Hetzner, if those plans
can be ordered. The hosted setup costs $25 now, or $45 with Vercel Pro for commercial use.
The saving pays for backups, updates and monitoring that the operator now does alone. A
lost backup can lose frozen evidence that the law requires a site to keep.
