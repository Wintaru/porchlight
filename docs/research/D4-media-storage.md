# D4 research — media storage: Supabase Storage vs Cloudflare R2

Checked 2026-09-11 against official pricing and docs pages. Supabase DB and auth cost
is the same in both options, so it is excluded.

## A) Supabase Storage

1. **Storage.** Free: 1 GB. Pro ($25/mo): 100 GB included, then $0.0213/GB-month. [pricing](https://supabase.com/pricing)
2. **Egress.** Free: 5 GB. Pro: 250 GB, then $0.09/GB. The Pro spend cap is on by default, so overages need it off. [pricing](https://supabase.com/pricing)
3. **Max file size.** Free: 50 MB. Pro: 500 GB. Standard uploads to about 6 MB. Above that, resumable TUS uploads from the browser. [limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [resumable](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
4. **Image transformations.** Pro and above only. 100 origin images included, then $5 per 1,000. Not on Free. [docs](https://supabase.com/docs/guides/storage/serving/image-transformations)
5. **Direct browser upload.** Yes, through `createSignedUploadUrl` on the server and `uploadToSignedUrl` in the browser. [reference](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
6. **CDN.** Built in. Public buckets cache well. Pro gets Smart CDN with purge on update or delete. [fundamentals](https://supabase.com/docs/guides/storage/cdn/fundamentals)

## B) Cloudflare R2 + Cloudflare CDN

1. **Storage.** Free: 10 GB-month. Then $0.015/GB-month. [pricing](https://developers.cloudflare.com/r2/pricing/)
2. **Egress.** Zero, confirmed. Operations replace it: Class A (writes) 1M free then $4.50/M, Class B (reads) 10M free then $0.36/M. Deletes free. [pricing](https://developers.cloudflare.com/r2/pricing/)
3. **Max file size.** Single PUT 4.995 GiB. Multipart 4.995 TiB. No plan caps. [limits](https://developers.cloudflare.com/r2/platform/limits/)
4. **Image transformations.** Cloudflare Images transformations work on an R2 custom domain. 5,000 unique transformations free per month, then $0.50 per 1,000. [pricing](https://developers.cloudflare.com/images/pricing/)
5. **Direct browser upload.** Yes, S3 presigned PUT URLs (1 s to 7 days). Bucket CORS rules required. [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
6. **CDN.** Needs a custom domain on a Cloudflare zone (Free plan is fine). `r2.dev` is for development only. Set a Cache Everything rule for video. [public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)

## Cost scenarios

**Small: 20 GB stored, 100 GB egress per month**

- Supabase Free: not possible (1 GB storage, 5 GB egress, 50 MB files).
- Supabase Pro: inside the included amounts → **$25.00**.
- R2: (20 − 10) × $0.015 = **$0.15**. Egress $0.

**Growing: 200 GB stored, 1 TB egress per month**

- Supabase Pro: $25 + (200 − 100) × $0.0213 + (1,000 − 250) × $0.09 = **$94.63**.
- R2: (200 − 10) × $0.015 = **$2.85**. Reads stay inside the free 10M with CDN caching.

## Comparison

| | Supabase Storage (Pro) | R2 + Cloudflare CDN |
| --- | --- | --- |
| Storage | 100 GB included, $0.0213/GB | 10 GB free, $0.015/GB |
| Egress | 250 GB included, $0.09/GB | $0 |
| Max file | 500 GB (50 MB on Free) | 5 GiB PUT, 5 TiB multipart |
| Image resize | 100 included, $5/1,000 | 5,000 free, $0.50/1,000 |
| Browser upload | Signed upload URL, TUS | Presigned PUT |
| CDN | Built in | Cloudflare Cache on a custom domain |
| Small / Growing | $25 / $94.63 | $0.15 / $2.85 |

## Two facts that matter most

- Video on Supabase Free is not possible (50 MB cap, 1 GB total). Supabase Storage means the Pro plan, $25 a month, from day one.
- R2 speaks the S3 API. An accessor written against S3 also works with AWS S3, Backblaze B2, and MinIO. That matters for self-hosters of an open-source project.
