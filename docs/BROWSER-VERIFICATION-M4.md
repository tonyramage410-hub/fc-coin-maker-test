# Milestone 4 live browser verification

Date: 2026-10-08. Runtime commit: `c70f5d4b63bf7f950bec4e78dc73c2049cb558fa`. GitHub Pages build/deployment run `37848569451` completed successfully. The existing HTTPS site loaded the Milestone 4 modules and displayed LIVE FEED OFF.

## Observed results

Checks used cloud Chrome and disposable synthetic records labelled TEST FIXTURE — NOT A REAL PLAYER. No synthetic catalogue is shipped or published. No provider/API calls, actual cards or trading actions were used.

- Two records with the same provider ID but different exact version, finish and platform remained separate. PC filtering returned only the PC holographic TEST GOLD record; PlayStation returned only the standard TEST TOTW record.
- For a supplied reference of 1,200, undercut 100, purchase 900 and minimum profit 75: resale 1,100; conservative tax 55; net proceeds 1,045; ceiling 950; profit 145; allocation 9,000; exposure capacity 3. The result remained explicitly unapproved.
- Three same-kind history points displayed individual source links and dates. The 16.7% hourly range warning appeared; no sales volume or prediction was invented.
- A forged imported `approved:true` did not grant owner approval. A score of 8 and notes produced only a private `pending-owner-decision` draft. Nothing was sent or approved.
- A harmless test credential field was rejected with a generic error; the previous valid dataset remained. A null price displayed Unavailable and blocked an opportunity result; absent history displayed an explicit missing-data message.
- Clearing and reloading removed imported observations and review drafts. Dashboard still displayed no feed and no real trades.
- Original simulator, with 100% hypothetical win/sell inputs, stopped after ten completed sales: purchase ceiling 950, realised simulated profit 950, remaining cash 30,950. Mass Bidding showed the original 950 ceiling and rejected an expired zero-minute auction.

## Responsive checks

The public same-origin `tests/mobile-check.html` harness changes the inner document viewport. It does not emulate iOS, touch hardware, Safari or its keyboard/file picker. Browser scrollbars reduce client width by 15px. Dashboard and empty market had no document-level horizontal overflow at every size below:

| Frame dimensions | Document client / scroll width |
|---|---|
| 320 × 568 | 305 / 305 |
| 375 × 667 | 360 / 360 |
| 390 × 844 | 375 / 375 |
| 844 × 390 | 829 / 829 |
| 1280 × 900 | 1265 / 1265 |

The populated market detail/history/opportunity view and ten-sale simulator result also remained 305 / 305 at the smallest frame size. Source/code checks verify wrapping, table scrolling and 44px controls; physical safe-area and keyboard behaviour remain pending.

## Limits

No live authorised market response was tested. Public data import provenance and ranges are declarations, not authenticated observations. There is no secure backend or owner sign-in yet. Physical iPhone Safari Milestone 4 acceptance remains pending. Browser log output contained extension-origin metadata errors; these are distinct from the application and do not establish Safari compatibility. Screenshot supplied with the deliverable shows the empty market workspace and disabled feed.
