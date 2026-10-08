# FC27 market data contract v1

This app imports sanitised, permitted JSON **into the current tab only**. It makes no provider requests. No sample catalogue is supplied. Reload clears imported data and drafts. Importing is not authentication of the source; permitted use and tick verification are declarations requiring evidence. Do not include tokens, cookies, passwords, session IDs or any account data.

Envelope: `{"schemaVersion":1,"cards":[]}`. Max 1 MB, 200 exact card/platform records, 500 history points per card. A bad record rejects the whole batch; the previous valid batch remains. No silent partial imports. Unknown approval fields are discarded and never authoritative. Credential-like fields reject the batch. Source links must be HTTPS, without embedded credentials, query strings or fragments. No remote scripts, images or previews are loaded.

Every card must supply:

| Field | Required type / meaning |
|---|---|
| provider | Nonempty provider namespace, e.g. `parse-futbin` |
| game | Exactly `FC27`; never substitute FC26 |
| cardId | Nonempty string ID scoped to provider and game |
| name, rating | Exact card name and integer rating 1–99 |
| version | Exact supplied card-version label, never inferred from name/rating |
| finish | `standard` or `holographic`; missing/unknown requires reconciliation |
| platform | `ps`, `xbox`, `pc`, `switch`; never silently alias platforms |
| price | Positive integer on validated model tier, or `null` when absent |
| observedAt | Actual price observation/update ISO UTC time, or `null` |
| uncertaintySeconds | Nonnegative integer; include age-text rounding precision |
| bounds | `{min,max}` valid tier prices, or `null`; no generic fallback |
| ticksVerified | Boolean declaration, set true only with independent FC27 evidence |
| source | `{name,url,endpoint,retrievedAt,permittedUseConfirmed}` |
| history | Array; empty means no historical evidence |

`source.retrievedAt` is a strict ISO UTC timestamp. It is not automatically a price update time. `source.permittedUseConfirmed` must be a boolean; false blocks opportunity analysis. A missing price is **not zero**. The offline Parse converter turns documented zero/unavailable prices into null.

Canonical identity is `JSON.stringify([provider,game,cardId,version,finish,platform])`. Each historical point supplies `cardKey` equal to that exact identity, `observedAt` UTC, positive integer `price`, `kind` (`hourly-average`, `daily-average`, `observed-bin`, `completed-sale`) and HTTPS `sourceURL`. Historical averages need not be listing ticks. Duplicate timestamps within the same observation kind reject instead of double-counting. Different history kinds are not combined into a risk calculation.

Freshness: ceil((now − observedAt)/1000) + uncertaintySeconds. <=300 seconds is fresh under a project policy, not an EA guarantee. Future retrieval/observation dates, unknown dates, missing prices and stale prices block opportunity calculations. Freshness is refreshed every 30 seconds and on analysis. An imported observation never becomes fresh merely because it was imported now.

Opportunity analysis needs verified ticks, exact bounds, a fresh quote, and permitted-use confirmation. It subtracts a user-selected undercut and rounds resale down on the Milestone 3 tier model. Net proceeds = resale − ceil(resale/20). Maximum purchase = floor-tier(min(card maximum, net proceeds − minimum profit)). Requested purchase must use valid increments and actual bounds. Total pool = floor(total bankroll × allocation /100) − commitments, clamped at zero. Batch purchase cost must fit remaining pool; conservatively all commitments also count toward per-card exposure. No resale, success rate, liquidity or real profit is promised.

History shows the latest 30 of up to 500 points, all with sources and kinds. Risk uses at least three comparable hourly-average points; range >=10% is flagged high. This is a historical diagnostic, not a calibrated probability or forecast. Missing history/volume keeps liquidity unknown.

# Offline Parse conversion

`node tools/convert-parse-export.mjs price-export.json verified-context.json > market.json`

The CLI accepts only the documented `get_fc27_player_price` PlayStation shape. Context must contain game, platform, endpoint, cardId, name, rating, version, finish, ticksVerified, permittedUseConfirmed, sourceURL, retrievedAt, as above. Exact identity must match; unknown finish requires user/source verification. It does NOT fetch data or accept a key. `updated` age text is subtracted from the assembly timestamp, with rounding uncertainty. `Never`/unrecognised ages leave observedAt null. Fractional historical prices are rejected for explicit reconciliation rather than rounded into fake observations. See tests for synthetic payloads; none are real market evidence.

FC27 search exports are useful for identity/catalogue but their price timestamps/ranges are not established: import catalogue records with null price/observation/bounds unless detail evidence supplies these. A licensed adapter for a live catalogue still requires provider access and real-response validation.
