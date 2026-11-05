# Cloudflare review branch: PRs 53 and 54

This branch combines PR #53 (lazy Inbox runtime loading) and PR #54 (Cloudflare Wasm and dependency bundling fixes) on upstream main. It uses Neon Object Storage instead of an R2 binding. It is intended for a separate test Worker.

## Cloudflare Workers Builds

- Repository: `EndlessCCL/feedlog`
- Branch: `test/cf-pr53-pr54-neon`
- Worker name: `feedlog` (must match `wrangler.toml`)
- Build command: `pnpm build:cf`
- Deploy command: `pnpm deploy:cf`
- Node.js: 22

The Hyperdrive `POSTGRES` binding contains the test configuration ID supplied for this review. Create the `feedlog-inbox` queue before deploying; its producer and consumer are configured in `wrangler.toml`. No R2 bucket is required by this branch.

## Object storage build variables

Set these under the Worker build variables and secrets before installing/building:

| Variable | Value |
| --- | --- |
| `S3_ACCESS_KEY_ID` | Neon storage credential `token_id` (secret) |
| `S3_SECRET_ACCESS_KEY` | Neon storage credential `s3_secret_access_key` (secret) |
| `S3_BUCKET` | Existing Neon bucket name |
| `S3_REGION` | Neon storage region, e.g. `us-east-2` |
| `S3_ENDPOINT` | Neon branch S3 endpoint, without the bucket suffix |

The credential needs storage read/write scopes. Keep credentials out of Git. NuxtHub chooses the S3 driver at build time, so runtime-only variables are insufficient. The build log should report `hub:blob` using the `s3` driver.

## Runtime configuration and first signup

Set `BETTER_AUTH_SECRET` and `SYSTEM_ADMIN_EMAILS` as Worker secrets. Set `BETTER_AUTH_URL` to the actual HTTPS Worker URL, enable `AUTH_EMAIL_ENABLED=true`, and use `AUTH_EMAIL_VERIFY=false` for a test without an email provider. Set the admin email before its first signup. Keep `BETTER_AUTH_URL` in the Wrangler public variables synchronized with the test URL.

Enable `vector` in the Neon database, visit `/setup` to initialize schema, and then register the configured admin email.

## Verification

Verify the first Inbox queue delivery, customer Widget/staff Inbox bidirectional messages, snooze and automatic wake, and image upload/read after refreshing. Native R2 and live Neon S3 behavior have not been validated by a cloud deployment in this review.

If CF reports `@better-fetch/fetch` cannot be resolved, clear the dependency/build cache and rebuild this branch. A frozen-lockfile fresh install and the client build resolved that package locally; the CF failure has not yet been reproduced. Do not externalize this browser dependency.
