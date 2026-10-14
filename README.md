# wardogs-goldbars

Daily WARDOGS gold exchange report, using WardogsHub (unofficial).

## Run locally

Requires Node.js 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile --ignore-scripts`,
then `pnpm test`. Preview with `node post-price.mjs --dry-run`; output includes
`output/embed.json`, `output/history.png`, and `output/quote-YYYY-MM-DD.json`.
Fetch raw current quote/history with `node get-price.mjs`.
To post, set `DISCORD_WEBHOOK_URL` in the process environment and run
`node post-price.mjs`. `.env` files are not loaded automatically.

## Report and assessment

The report includes the current price, daily dollar/percentage change, previous
14-day median and price percentile, previous 30-day percentile and range,
an explained assessment, and a chart covering today plus up to 30 prior days.
Lower prices buy more bars. Ranking uses only prior observations, excluding today.
Percentile = 100 × (prices below today + half the prices tied with today) / count.
Median averages the middle two values when the count is even.

The previous 14 days determine the label: at or below the 25th percentile is
Favorable; at or above the 75th is Expensive; otherwise Typical. These are
provisional historical comparisons, not validated forecasts or optimal buying rules.
The 30-day comparison supplies context and flags disagreement between windows.
Each comparison requires every daily quote in its window. Missing dates or an
economy boundary make that comparison unavailable; no interpolation is used.
Flat markets use a tied midpoint percentile of 50, not a false cheap signal.

The default economy boundary is `2026-09-10` (Early Access launch). Set
`HISTORY_START_DATE=YYYY-MM-DD` to a later known economy reset when necessary.
Patch/reset detection is manual; the script cannot establish whether an
unannounced change has invalidated historical comparisons. Pre-launch data is
retained in snapshots but excluded from assessment and chart.

The assessment assumes a player wants a cosmetic and should keep cash for
gameplay. It cannot personalize a purchase without their cash reserve, bars
owned, cosmetic goal and deadline. Exchanges are one-way and non-refundable.
No price forecast or backtested buy/wait strategy is claimed.

## GitHub Actions and development

Work on `dev`. In Actions → Post WARDOGS gold price → Run workflow, select `dev`.
Development posts use only the repository secret `DISCORD_WEBHOOK_URL_DEV`.
`main` posts use `DISCORD_WEBHOOK_URL` for production. A missing development
secret fails rather than falling back to production. Daily schedules run on
`main` at 01:17 UTC; scheduled runs can be delayed or dropped. Public repository
schedules may be disabled after 60 days without activity.
The earlier `gold.py` is legacy; the workflow runs the Node.js implementation.

Every successful fetch archives the complete fetched history, quote date,
source and fetch timestamp before analysis. Each workflow run uploads it with
the chart and embed preview as an artifact retained for 90 days. Download those
artifacts for permanent retention. Local runs on the same date overwrite that
date's local snapshot; workflow runs have separate artifacts. No webhook secrets
are saved. Source history may be revised; snapshots capture what was received
and do not prove in-game accuracy. Stale quotes fail before posting.
Discord confirms sends with `wait=true`; uncertain sends are not retried.
Manual reruns send new messages; no deduplication is implemented.

Source and mechanics: https://wardogshub.gg/gold-market/
Schedule behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
