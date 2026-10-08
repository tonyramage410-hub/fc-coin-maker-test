# fc-coin-maker-test
Description (optional) FC Coin Maker — iPhone Safari development test

## Audited Milestone 3.1
Offline, deterministic scenario simulator and planning calculator. No EA connection, trading automation, live prices, recommendations, paid services or API credits. Market tools and history are placeholders. This website is not a Safari extension or native iPhone app.

Existing website: https://tonyramage410-hub.github.io/fc-coin-maker-test/

## Reproducible tests (Node.js 18+)
No npm dependencies required:
```
node tests.mjs
node --test tests/*.test.mjs
```
The first command preserves original assertions. Expanded tests include calculation, simulation, security and mocked interface checks. Mock tests do not substitute for browser testing.

## Local preview
From this directory:
```
python3 -m http.server 8000 --bind 127.0.0.1
```
Open http://127.0.0.1:8000/. ES modules require HTTP(S); file:// and iPhone Quick Look are unsupported. Offline means calculation after static assets load, not offline caching.

## Files
- index.html, styles.css, app.mjs: responsive interface and validation.
- calculations.mjs: pure model imported by both UI and tests.
- simulator.mjs: seeded hypothetical model with auditable ledger.
- tests.mjs, tests/: original and expanded checks.
- AUDIT.md, TEST-RESULTS.txt: findings and test evidence.

## Accounting and limitations
Defaults are hypothetical examples, not recommendations. Price tiers, 150 minimum, 15M cap, 50-slot capacity, 15-minute gate and ten-sale review policy are demo assumptions. Exact FC 27 card limits and fractional-tax rounding remain unverified.

Sale = reference minus undercut, rounded down to a model tick. Tax = ceil(sale/20), conservative. Purchase ceiling is rounded down after subtracting target profit, respecting manual card bounds.

Balance means total bankroll BEFORE commitments. Trading pool = max(0, floor(balance × allocation / 100) − commitments). Deduct commitments once. Reserve is never used by the simulator. Proceeds return to the simulated pool; profits can increase it and losses reduce it.

Each attempt has one win trial. Each newly acquired card has one immediate sale trial. Decline is applied before tier rounding; out-of-range sales are not completed. Unsold cards are retained at cost and never retried. Runs stop after ten completed sales or the attempt limit. There is no asynchronous marketplace, time model, realistic liquidity or inventory valuation.

Realised simulation P/L = net proceeds − cost of sold cards. Cash after = balance − commitments − purchases + proceeds. Cash + inventory at purchase cost = uncommitted starting balance + simulated realised P/L. Inventory at cost is not a guarantee of recovery.

Inputs are directly editable in both tools. Any edit clears simulated results/events. Inputs survive navigation within the tab but reset on reload. No local storage, server, login, credentials or persisted history exists.

## Hosting and phone testing
Existing main branch/root layout and original README identity are preserved. No Pages settings, workflows, domains, accounts or paid services are changed. Open the hosted HTTPS URL in iPhone Safari and follow the acceptance checklist in AUDIT.md. Physical-iPhone verification remains outstanding.


## Optional browser tests
With Playwright and an existing local Chromium installation available:
```
node tests/browser-check.mjs
```
If needed, set FCM_BROWSER_EXECUTABLE to the absolute path of an already-installed Chromium executable. The test serves this project on an ephemeral loopback port, checks five viewport sizes and aborts any outside-host requests. It requires no account or API key. Browser tests are separate from `tests/*.test.mjs` and do not run automatically or install dependencies.

## Publication status
Published to the existing main branch and verified on GitHub Pages on 2026-10-08.
The GitHub App installation is restricted to this test repository. Successful content writes confirm the original integration permission blocker is resolved.

Current-session verification: original simulator assertions and all 31 expanded Node tests passed. Live browser checks passed for dashboard, module initialization (audited M3.1), Sniping Lab navigation and editable inputs, ten-sale stop (950 simulated profit; cash 30,950), decline/loss scenario (-4,280), mass-bid ceiling (950), expired auction rejection and blank profit validation. All five hosted runtime assets returned HTTP 200 with suitable MIME types.

The optional local Chromium test could not be rerun in this session because the browser executable is absent; prior viewport evidence remains historical. Live checks used the cloud Chrome browser, not physical iPhone Safari. Physical-iPhone acceptance remains outstanding. Market tools, approved cards and history remain placeholders. No money, API credits, EA connections, real transactions or automation were used.
