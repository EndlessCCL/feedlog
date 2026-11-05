# Cloudflare review branch: PRs 53 and 54

This branch combines PR #53 (lazy Inbox runtime loading) and PR #54 (Cloudflare Wasm and dependency bundling fixes) on upstream main. It uses Neon Object Storage instead of an R2 binding. It is intended for a separate test Worker.

## Cloudflare Workers Builds

- Repository: `EndlessCCL/feedlog`
- Branch: `test/cf-pr53-pr54-neon`
- Worker name: `feedlog` (must match `wrangler.toml`)
- Build command: `pnpm build:cf`
- Deploy command: `pnpm deploy:cf` (uses a pinned Wrangler CLI via `pnpm dlx`; no global Wrangler installation required)
- Node.js: `22.23.2` (pinned by `.node-version`; remove or match any `NODE_VERSION` dashboard override)

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

If CF reports `@better-fetch/fetch` or `@floating-ui/dom` cannot be resolved, inspect the `[build-deps]` lines emitted before Nuxt starts. They check resolution from the actual importing packages. If package links are missing, the preflight removes only `node_modules`, reinstalls once with `pnpm install --frozen-lockfile`, and rechecks before Nuxt starts. Both dependencies are declared by their parent packages in the frozen lockfile. Clear the dependency/build cache, use Node `22.23.2` and pnpm `10.15.0`, and build the latest commit. The reported CF run used Node `24.18.0`; a local build under that exact version also succeeded, so Node 24 is not a demonstrated cause. The Node 22 pin keeps the test setup aligned with the earlier baseline. Do not externalize browser dependencies.
