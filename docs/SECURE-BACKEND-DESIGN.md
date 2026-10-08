# Secure backend design — not deployed

Status: provider requests disabled. No API token inspected, no credit spent, no backend account connected or activated. This design must be approved and configured before live market integration can be claimed.

## Provider investigation (documentation only, 2026-10-08)

Existing provider reference recovered: Parse FUTBIN wrapper, not Parse Platform database/server. Earlier account balance references are historical and were NOT verified. Marketplace documentation advertises FC27 search at 3 credits/call and PlayStation price detail at 2 credits/call. Search separates card versions and PS/PC prices but does not provide an authoritative update timestamp. Price detail supplies source-relative update age and a response-assembly timestamp. These times must remain distinct. Documentation is not a successful authorised live test, and a marketplace listing alone does not prove permission to redistribute FUTBIN data.

Public references (read-only; do not invoke the API examples):
- https://parse.bot/marketplace/1b6234f9-0dfb-4cca-99b4-2d6d37aec6a7/futbin-com-api
- https://parse.bot/pricing
- https://developers.cloudflare.com/workers/platform/pricing/
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## Architecture and access

GitHub Pages remains the static UI. A separately hosted HTTPS backend authenticates the owner, validates exact FC27 requests, and owns the provider credential in a server-side secret store. The frontend never sees the credential. CORS is an exact origin allowlist, NOT an authentication mechanism (other github.io paths share the same origin). No bearer secret can be built into frontend code, URLs or localStorage. Production access uses owner identity/OIDC with an owner allowlist and short-lived secure sessions, CSRF protection for writes, expiry and revocation. Third-party cookies on iPhone may block cross-site auth: prefer a same-origin UI/API reverse-proxy domain or top-level sign-in flow; do not work around Safari privacy controls with exposed secrets.

Read flow: UI → authenticated `/v1/cards?game=FC27&query=…&platform=…&page=…` → shared server cache → credential-bearing Parse call ONLY after explicit budget authorisation. Exact IDs, versions and platform data validated server-side. No arbitrary upstream URL, scraper ID or endpoint from clients; upstream host/endpoints hard-coded after response-shape validation. Provider redirects disabled; strict request length/timeouts/response-size/schema limits. Rate limits, single-flight deduplication, caching and daily credit limits must be durable/atomic, not process-local. No automatic refresh that incurs credits. Cache misses return unavailable unless a specific approved spend is reserved atomically. Upstream failures never create zero prices or replace stale data with synthetic values.

Search and quote caches key by provider/game/cardId/version/finish/platform plus query/page. Cache retains original source observation and retrieval times. A new response never promotes an unknown observation age to fresh. Null, partial and stale data return explicit reason codes. Responses project only the contract fields; redact provider errors, key headers and telemetry. No arbitrary proxy, no EA route, cookies or login, no trade endpoint.

Approval flow: authenticated owner review → explicit decision against immutable observation fingerprint and stated scope → append audit event → published approval receipt. Backend checks owner subject server-side; a public client cannot claim reviewer identity. Draft/import flags never grant status. Receipts expire, can be revoked and no longer apply to changed card version/platform/quote. Current static implementation uses an empty repository-controlled approval register and cannot grant public visitors approval permissions.

Routes proposed:
- GET `/v1/status`: connection/credit gate, no credentials
- GET `/v1/cards`: only authorised, cached FC27 catalogue
- GET `/v1/cards/:id/quote`: exact platform/version, timestamp, range, provenance
- GET `/v1/cards/:id/history`: same identity; observation kinds kept separate
- POST `/v1/owner/reviews`: owner-only pending review creation
- POST `/v1/owner/reviews/:id/decision`: owner-only explicit approve/reject/revoke
- GET `/v1/approvals`: published receipts only, no private notes

## Free and paid options (documented, not activated)

| Option | Hosting cost | Provider cost / limitation |
|---|---|---|
| Current Pages + local sanitised exports | No new hosting cost | No calls or credits; import/search/calculation works, live integration absent |
| Cloudflare Workers Free + suitably configured owner auth/cache | Free tier, currently 100,000 requests/day and 10ms CPU/invocation | Parse calls still consume credits. Verify adapter fits quotas, configure fail-closed quota handling and durable credit accounting. No billing upgrades or service activation without approval. |
| Cloudflare Workers Paid | Documented minimum US$5/month plus possible usage charges | Provider credits separate; not authorised |
| Parse introductory credits | Advertised 200 starter credits for new signups | Existing account eligibility/balance not verified. Do not create a new account to evade limits or assume existing credits are free. |
| Parse Hobby | Advertised US$30/month, 1,000 credits with overage available | Not authorised; do not activate/top up |

Pricing can change. Read provider permissions/terms and current limits before any setup. Deployment of a backend requires account/service authorisation; a paid call requires prior approval of exact endpoint(s), credit amount and purpose. No spending is implied by this assignment.

## Release gate for live integration

1. User supplies official account/provider documentation and confirms permitted FC27 access/redistribution. Do not ask for keys in chat.
2. User approves a free backend setup; securely enter the key in that backend's secret manager.
3. Confirm endpoint schema via sanitised existing response, or ask for a narrowly budgeted live test. Current adapter is documentation-based and offline-tested only.
4. Implement owner auth, durable spend reservations, hard credit ceiling, cache, timeout and allowlist; security-test with fake upstream and quotas.
5. Only after approval call live search/quote/history, record endpoint/time/actual debit and source-specific IDs. Validate prices, platform, bounds, update precision and null semantics.
6. Update frontend CSP to that exact backend and publish public-data permission scope. No credential is allowed in Pages. Real integration remains disabled until all gates pass.
