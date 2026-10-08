# Safe deployment / rollback

Only `tonyramage410-hub/fc-coin-maker-test` is in scope. Publish static source to existing `main`/root Pages configuration; no settings or paid resources needed. Commit runtime files together so the HTML and modules form one release. There are no tokens or provider calls in this release. Do not install a backend, enable a provider or place private exports in the repository.

Published runtime: `c70f5d4b63bf7f950bec4e78dc73c2049cb558fa`. Pages run `37848569451` completed successfully; the live application was checked in cloud Chrome. Later documentation-only commits do not change this runtime. See BROWSER-VERIFICATION-M4.md for evidence and physical Safari limits.

Milestone 3 rollback branch: `rollback/milestone-3-verified`, commit `4fa9e95621887c6f3c6b5422c0b9e7fa5d2161ee`. This is the inspected M3.1 release. Its five runtime files and tests were preserved. User reported physical iPhone Safari acceptance before this assignment.

Tests: `node tests.mjs` and `node --test tests/*.test.mjs`. Optional browser tests need Playwright and already installed engines. Serve locally via `python3 -m http.server 8000 --bind 127.0.0.1`; use HTTP(S), not iPhone Quick Look/file://.

After deployment open https://tonyramage410-hub.github.io/fc-coin-maker-test/ and verify dashboard, simulator ten-sale stop, planner validation, Market empty/import states, exact filters, expired data and review draft. Hosted assets must be HTTP 200 with correct MIME types and no application network/credential requests. No approval or recommendation should be published by default.

To roll back without rewriting history, inspect current main and restore the five M3 runtime files (`index.html`, `styles.css`, `app.mjs`, `calculations.mjs`, `simulator.mjs`) from the saved rollback commit into a new commit on main. M4 modules become unreferenced; can remain as source. Do not force-push or alter unrelated projects. Check the resulting Pages site in a browser. Keep M4 test files on the M4 branch/release if reverting markup changes makes those tests unsuitable.

iPhone acceptance: open direct HTTPS in Safari; test portrait/landscape and small screen, numeric keyboards, picker/paste imports, tabs, review copying, source links, bottom safe area, freshness changes and reload clearing. Browser viewport emulation is not physical Safari testing. Milestone 4 requires a fresh physical acceptance check even though M3 passed.
