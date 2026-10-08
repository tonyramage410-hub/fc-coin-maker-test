# Owner-only approval publication

No real card has been approved in this release. `approved-cards.mjs` exports an empty authoritative register. Imported `approved` fields and local scores are discarded. There is no public button to approve or automatic approval based on profit.

1. Select the exact imported FC27 card/version/finish/platform, inspect provenance, history, timestamps, bounds, tick evidence and calculated exposure.
2. Enter a review score 0–10 and notes; prepare a private owner-review request. Copy the generated draft and send it to Luke yourself. This sends nothing automatically. Drafts are pending, not approved.
3. Luke explicitly reviews this exact observation and decides approve/reject, price scope, expiry and reasons. The assistant must retain the explicit decision; no inference from score, prior trades, generic approval or import metadata.
4. Only after that explicit decision, an authorised repository edit may add `{key, observation, status:'approved', reviewedBy:'owner', reviewedAt, expiresAt}`. `observation` is the exact `observationFingerprint` from the validated data and `key` is canonical identity. Both UTC times must be valid; expiry must be later than review. Keep a separate owner-decision audit entry. GitHub repository write access is the present publication trust boundary, not a frontend password.
5. The badge applies only to the same observation while fresh and before expiry. It does not approve every price or trade for that player. Changed quote, version, rating, source, history or platform invalidates the receipt; revoke by removing the register entry and recording the revocation in the audit.

Limitations: the public site has no authenticated owner portal or signed remote approval service. All repository writers must obey the owner decision gate. An imported record cannot prove source truth or review provenance. A later secure backend must enforce owner identity and audit decisions server-side; that part is designed but not deployed.
