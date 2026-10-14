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

## Price alerts

Each daily report can include an alert when a condition first becomes true:
- Default: price enters the cheapest quarter of the previous 14 daily quotes.
- Optional repository variable `GOLD_ALERT_MAX_PRICE`: a whole cash amount, e.g. `250000`.
- Optional `GOLD_ALERT_ROLE_ID` (production) and `GOLD_ALERT_ROLE_ID_DEV` (development): the ID of an opt-in Discord role. Leave unset for no ping. Configure that role to allow webhook mentions; only this role is allowed, never everyone or users.

Conditions rearm after a confirmed quote no longer meets them. A first run with no saved
state alerts if already qualifying. A history gap preserves the prior favorable state.
Changing the price ceiling or economy boundary starts a new alert baseline.
State is saved only after Discord confirms delivery and restored from the latest
branch-specific artifact; production and dev never share state. Missing/expired
state initializes a baseline and can repeat a qualifying alert. Damaged state or
restore failures stop posting rather than guessing. Artifact retention is 90 days.
The daily report still posts each run; suppression applies to alert text/role pings.
These are daily checks, not continuous intraday monitoring. Uncertain network sends
still require checking the channel before rerunning, since delivery can be ambiguous.

## Free savings planner

`planner/` contains a static, mobile-friendly savings calculator. Players enter their
cosmetic bar target, bars owned, cash balance and gameplay reserve. It returns
remaining bars, affordable whole bars toward the goal, cost, shortfall and cash left.
Presets are reference bar costs; players should verify listings in game or use a
custom target. Preferences use browser-local storage and aren't sent to our server.
The daily script builds `output/planner/` with `current-price.json`. Missing or stale
UTC quotes pause calculations, including when an open tab crosses UTC midnight.
No game-account integration, login, database, paid server or custom domain is required.

Preview: run `node post-price.mjs --dry-run`, then serve `output/planner/` with any
static HTTP server. Do not open it directly as a file because it loads a JSON quote.

After the dev implementation is reviewed and merged into main:
1. In repository Settings → Pages, choose **GitHub Actions** as the source.
2. In Settings → Secrets and variables → Actions → Variables, set `ENABLE_PLANNER_PAGES` to `true`.
3. Run the daily workflow on `main`. It deploys the built planner and fresh quote to GitHub Pages.
4. After confirming the published page, set `PLANNER_URL` to the returned Pages URL (normally `https://fairz33.github.io/wardogs-goldbars/`). The embed then includes a planner link. `PLANNER_URL_DEV` can point to an optional development preview.

With Pages enabled, each daily production run refreshes the planner's quote after
posting the report. Until today's run publishes, the previous quote is marked stale.
A successful Discord post followed by a failed Pages deployment can leave the page
stale; the workflow reports the deployment failure. Pages deployment is gated by
`ENABLE_PLANNER_PAGES`; it is off by default and dev runs never deploy production.
