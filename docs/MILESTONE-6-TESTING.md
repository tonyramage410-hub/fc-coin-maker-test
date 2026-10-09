# Milestone 6 — synthetic backend connection

Date: 9 October 2026. This update connects the existing Milestone 4 GitHub Pages dashboard to the existing Milestone 5 Worker. All market data returned by that Worker is fictional. No real-market integration is claimed.

Website: https://tonyramage410-hub.github.io/fc-coin-maker-test/
Backend: https://fc-coin-maker-m5-test.tonyramage410.workers.dev/

## Implementation

- `backend-client.mjs`: fixed HTTPS origin; public GET requests only to status and `/v1/demo/cards` search, exact quote and history routes. Requests omit credentials and referrers, disable caching, reject redirects and time out after 30 seconds. No URL configuration, secret storage, provider fallback or automatic network polling.
- `market-ui.mjs`: on-demand Load/retry and backend Search; exact identity checks across provider, game, card ID, version, finish and platform; validated quote/history displayed together. Request generations prevent delayed responses from restoring cleared or replaced data. Imports remain local and replace demo mode rather than merge with it.
- `index.html`: Milestone 6 labels and explicit fictional-data warnings. CSP permits connections only to the exact Worker origin; scripts and styles remain local, with no inline code or unsafe evaluation. Backend Search sits beside the filters for easier phone use.
- Known synthetic fixtures remain labelled as demonstrations and blocked from owner review even if re-imported. The real owner approval manifest remains empty. Local review drafts never publish approval or transmit notes.
- `app.mjs`, `calculations.mjs`, `simulator.mjs`, `market-data.mjs`, `approved-cards.mjs`, `parse-export.mjs` and `styles.css` are unchanged from the verified M4 main branch. The M5 Worker source/deployment is unchanged.

## Verification before publication

All checks passed after final source corrections:

1. **57 Node tests**: calculation/oracle tests, simulations, existing interface/import/security tests and seven new client test groups. New cases include exact identities, missing prices, malformed/unsafe responses, HTTP/network failures, invalid input with zero search requests, safety flag changes, cross-card history and no history fallback. See `TEST-RESULTS-M6-NODE.txt`.
2. **Five scenario browser runs**: 320×568, 375×667, 390×844, 844×390 and 1280×900. Dashboard/navigation, movable input forms, Mass Bidding expiry/limits, ten-sale simulation, loss scenarios, blank inputs, stale output clearing, tier rounding, reload and no horizontal page overflow. No remote requests when using scenario tools. See `TEST-RESULTS-M6-SCENARIOS.txt`.
3. **Five demo browser contract runs** at the same dimensions: platform/version/finish selection; quote/history rendering; null price; empty search; invalid query; approval lock; blocked real opportunities; HTTP 503/offline/malformed JSON; quote/history identity mismatch; failed history; clearing during a delayed quote; local import separation; pending-only review drafts. No unexpected origins, credentials, write requests, page errors or page overflow. See `TEST-RESULTS-M6-BROWSER.txt`.
4. **Two browser runs against the actual live HTTPS backend** at 390×844 and 1280×900, serving the staged frontend at its intended Pages origin: real browser CORS, actual searches and exact quote/history reads, fictional labels, fixed stale fixture dates, PS 1200 / PC 1300 / holographic 1000 / Xbox null, empty search, invalid input and approval restrictions. See `TEST-RESULTS-M6-STAGING.txt`.
5. **Eight live M5 HTTP test groups** independently rerun: disabled providers/zero credits/EA/automation/writes; catalogue/quotes; null price/history provenance; real routes return 503; owner writes return 423 despite forged identity; allowed read-only CORS and denied foreign origins; invalid queries/proxy paths blocked; HEAD/body/security header/documentation checks. Strict HTTPS Node requests succeeded. The checker needed a 30-second transport timeout in this environment; the original five-second timeout was too short, not a backend safety failure.

Browser engine: Chromium 153.0.8010.0. Mobile viewport/touch emulation is **not physical iPhone Safari or WebKit testing**. The browser harness uses `ignoreHTTPSErrors` for the test environment's intercepting proxy; this is not application code or a production setting. Separate Node HTTPS checks use normal certificate validation.

## Publication and rollback

The existing GitHub Pages main-branch deployment is used, without a new workflow, account, Worker or credential. Rollback branch `rollback/milestone-4-before-m6` preserves main commit `565b829ff557a8d4dfa87113269a53c86f40c7dd`. The existing M3 rollback and M5 backend branch are preserved. Reverting the M6 frontend commit restores M4; the Worker need not change.

The hosted website must be checked after publication. Pre-publication results alone do not establish that Pages has updated. Live verification results will be recorded separately after the actual hosted frontend passes its checks.

## Limits and remaining work

- The backend has four fictional fixture identities, not a real FC27 player catalogue. Fixed observation dates are deliberately stale; viewing/searching never refreshes them.
- Demo fixtures do not pass real-opportunity eligibility: permitted data use and FC27 tick verification remain false. Resale, tax, exposure and risk calculations remain conservative analytical models, not approved recommendations.
- No live Parse requests, provider credits, EA access, trades, billing or approval writes are implemented or enabled. Credit budget remains zero. Owner authentication and durable approval auditing remain unconfigured and therefore locked.
- History is a small fictional table, with demonstration range risk and unknown liquidity, not a live chart or forecast.
- No automatic polling, saved market session or offline quote fallback. Reload clears tab state; network errors require Load/retry. Requests to the free Worker consume ordinary free-tier request quota, not provider credits.
- Physical iPhone Safari testing of M6 still needs an actual device; this environment can independently test Chromium mobile layouts only.

## iPhone use

Open the existing website, tap **Market**, then **Load / retry backend demo**. Choose an exact fictional card to see price and history. Filters narrow the loaded results; **Search backend demo** fetches the matching subset. Load/retry resets the filters. Xbox deliberately shows an unavailable price. No fictional card can be approved or qualify as a real opportunity.
