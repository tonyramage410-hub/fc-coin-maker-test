# Milestone 4 testing report

Baseline: inspected main commit `4fa9e95621887c6f3c6b5422c0b9e7fa5d2161ee`, archived as `rollback/milestone-3-verified`. User reports physical iPhone Safari passed for M3. The simulator and calculation engines remain byte-identical to M3; navigation and its input event binding preserve the working modules while keeping market controls separate.

## Automated checks

Original simulator checks passed. Expanded Node suite: **50 passed, 0 failed** (31 prior tests + 19 market tests). See TEST-RESULTS-M4.txt. Independent arithmetic oracles cover price-tier boundaries, exhaustive M3 ticks up to 200,000 and 600 seeded simulation sessions. New tests cover exact identity/platform/version/finish separation, schema and size limits, malformed numeric data, unknown/missing/stale/future times, conservative freshness uncertainty, safe source URLs, secret rejection, no fabricated catalogue, zero-price handling, no default bounds, minimum profit, integer tax, exact commitments, batch exposure, comparable history, forged approval/import flags, approval expiry and data changes, offline Parse conversion and lack of frontend network/secret storage.

Testing caught and corrected an approval-fingerprint issue: recompute identity from actual card fields instead of trusting a previously stored key. No owner approvals were present or published.

Local Chromium/WebKit binaries were absent. A free browser download attempt failed (returned invalid/truncated archive); no engine test pass is claimed from that attempt. The live cloud Chrome browser and responsive-frame harness provide the separate browser verification record below. The harness alters document viewport dimensions but is not a physical iPhone or Safari engine emulator.

## Remaining verification limits

No authorised live Parse request has run; no current account credit balance, actual live response/schema, provider licence or redistribution permission was verified. No API credit used. The offline adapter is documentation-grounded and tested against explicitly synthetic fixtures only. Public site starts empty and labels imported observations; no fixture data is preloaded or represented as a real card.

No production owner authentication or secure backend is deployed. Approval publication is controlled by repository write access and explicit owner decisions. The register is empty. Local drafts cannot approve.

Milestone 4 physical iPhone Safari check remains pending: file picker, paste, numeric keyboard, scrolling, safe areas, source links, owner review copying, refresh clearing, portrait/landscape. M3's physical acceptance does not establish M4 acceptance.

Live GitHub Pages deployment succeeded. Cloud Chrome interaction and five responsive frame sizes passed the checks recorded in BROWSER-VERIFICATION-M4.md. This is not physical Safari acceptance or a live-market integration test.
