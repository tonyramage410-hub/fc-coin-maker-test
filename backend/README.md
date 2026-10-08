# FC Coin Maker — Milestone 5 backend

**Built and tested; not deployed.** Cloudflare authentication/permissions require the owner's approval before proceeding. No Cloudflare account, preview account, billing service or chargeable resource was created. No Parse, EA or other market provider was accessed.

This release is a stateless, public, read-only synthetic API. It has no outbound request implementation, credentials, storage bindings, jobs, trade endpoints or owner approval mutation. Runtime flags cannot enable providers. This is the completed backend for the authorised synthetic-only scope, not the future live-market/owner-authenticated service.

## Routes

| Route | Behaviour |
|---|---|
| GET `/` | Plain mobile-friendly scope/documentation page; no scripts |
| GET `/v1/status` | Hard-disabled providers, credit budget 0, no EA/automation/writes |
| GET `/v1/demo/cards?game=FC27` | Four explicitly fictional, distinct card/platform records |
| GET `/v1/demo/cards/TEST-001/quote?game=FC27&platform=ps&version=TEST%20TOTW&finish=standard` | Exact identity, fixed source timestamps, nullable price, freshness |
| GET `/v1/demo/cards/TEST-001/history?...same identity...` | Labelled synthetic historical averages and risk |
| GET `/v1/cards` and `/v1/cards/:id/quote` or `/history` | HTTP 503 `provider_disabled`; never synthetic fallback |
| GET `/v1/approvals` | Empty register; no approval decision has been supplied |
| `/v1/owner/*` | Reads 503 `owner_auth_not_configured`; writes 423 `owner_writes_locked` |

Search optionally accepts `q`, exact `platform`, `version` and `finish`; query lengths, unknown/duplicate parameters and control characters are rejected. Quote/history require every identity dimension. No arbitrary upstream URLs or client-provided data are processed. Fixtures have fixed historical timestamps, unverified ticks and no real-data usage permission, so importing them into M4 cannot qualify a real opportunity. The frontend is unchanged and remains disconnected.

## Security boundary

CORS permits the existing GitHub Pages origin for public reads only, without credentials. It is not owner authentication; all paths under the same github.io origin share that origin. Owner routes cannot be unlocked by a cookie, JWT header, reviewer name, score, imported flag or environment variable. There is no private data or writable operation in this release.

All responses include no-store, restrictive CSP, anti-sniff and privacy headers. HEAD/preflight bodies are empty. Errors do not echo request data or internal stacks. No application logs persist bodies, headers or tokens. Cloudflare itself still handles network metadata; platform logging controls must be reviewed at deployment.

## Reproduce verification

From `backend/`, run `npm ci --ignore-scripts`, `npm test`, `npm run build`, then `npm run test:runtime`. Dependencies are pinned by package-lock.json. The build is an offline deployment dry-run, not publication. No deployment script is included to avoid accidentally authenticating or publishing before approval.

18 backend tests passed; 8 additional tests passed inside Cloudflare's `workerd` runtime with outbound network access denied by the local test configuration. Existing M4 suite: 50 passed. See TEST-RESULTS-M5.txt and RUNTIME-TEST-RESULTS-M5.txt. Dependency audit: zero reported vulnerabilities on 2026-10-08. This is a point-in-time dependency check, not proof of absence of all vulnerabilities.

Normal `wrangler dev --local` failed here because OS network-interface enumeration is restricted. The alternate direct socket server did not become reachable and was stopped; HTTP-TEST-RESULTS is not presented as a pass. `workerd test` provided actual runtime validation without a listening socket. This does not verify deployed HTTPS, Cloudflare routing, account plan or physical Safari.

## Deployment gate and instructions

1. Obtain the user's specific permission for Cloudflare authentication. Use secure sign-in; never ask for passwords, OTPs or API tokens in chat. If sign-up requires acceptance of terms, the user must review/approve that separately. Temporary unclaimed accounts are not used as a workaround.
2. Confirm the selected account is Workers Free. Stop if payment details, a billing upgrade, paid service, paid plan or chargeable resource is required. Do not switch plan or supply payment details. Scope any deployment access to this test Worker/account where possible; request approval before broader permissions.
3. Inspect `fc-coin-maker-m5-test` in that account; stop on an unrelated existing-name collision. Deploy only this module with `npx wrangler deploy --config wrangler.json` after authentication is authorised. Do not enable a GitHub integration, automatic build, secrets, KV/D1/R2/Durable Objects, queues, cron or provider bindings.
4. Use the URL returned by Cloudflare; never invent a workers.dev URL. Run `node tools/check-backend.mjs https://THE-VERIFIED-RETURNED-HOST.workers.dev` to verify eight public HTTP checks. Save the output and inspect the root/status page over HTTPS. Only then claim deployment success and report the URL.
5. Keep M4 Pages and its CSP unchanged until a later authorised integration. Preserve current runtime commit `c70f5d4b63bf7f950bec4e78dc73c2049cb558fa` and M3 rollback branch. Backend source is saved separately on the Milestone 5 branch.

## Free-tier limits and remaining work

Official Cloudflare documentation checked 2026-10-08 lists Workers Free at 100,000 inbound requests/day per account, resetting midnight UTC, 10ms CPU/invocation and 128MB memory. Free quotas are shared with other Workers/Pages Functions on the account. Exceeding request or CPU limits causes errors, not successful responses; CPU/daily quota behaviour was not live-tested. No paid upgrade is authorised. workers.dev is suitable for this noncritical test service, not an availability guarantee.

This public synthetic API has bounded inputs/outputs but no durable per-client rate limiter. Public traffic could exhaust the free account quota. It cannot consume Parse credits because no provider implementation exists. Do not mistake isolate-local counters for a global spend guard. There is no storage or live-data cache.

Owner authentication, signed approval receipts, durable audit storage, atomic credit reservations, provider permission/redistribution checks and authorised live testing remain required before live market functionality. The present release deliberately denies all owner operations rather than inventing identity checks. For Safari, choose a same-origin owner UI/API or approved top-level sign-in flow; do not add a shared browser secret or rely on third-party cookies. Fixed-key JWT verification alone is insufficient for production key rotation.

Live Parse testing requires a separate approval specifying exact endpoints, number of calls and credit cost. All provider routes must remain disabled in the meantime. No bid, purchase, listing or trading automation is part of this API.

Official references:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/workers/platform/claim-deployments/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
