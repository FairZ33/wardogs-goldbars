# wardogs-goldbars

Requires Node.js 24; no packages needed. Fetching prices needs no credentials.
Discord posting uses the `DISCORD_WEBHOOK_URL` environment variable.

Run `node get-price.mjs` from this folder. It fetches WardogsHub's embedded
`data-gold-series` JSON and prints the current UTC day's cash cost per gold bar.
It exits with an error if the quote is old, future-dated, missing, or invalid.
The source is unofficial; freshness does not verify accuracy against the game.

Run checks with `node --test get-price.test.mjs post-price.test.mjs`.
Preview the Discord payload with `node post-price.mjs --dry-run`.
Post with `node post-price.mjs` after supplying the webhook in the environment.
The script does not load `.env` files automatically.

To use GitHub Actions, upload the **contents** of this folder to
https://github.com/FairZ33/wardogs-goldbars at the repository's root, including
`.github/workflows/daily.yml` and `.gitignore`. In Settings → Secrets and variables
→ Actions, create a repository secret named `DISCORD_WEBHOOK_URL` whose value
is your production Discord webhook URL. Also create `DISCORD_WEBHOOK_URL_DEV`
for the development Discord channel. Never put the URL into a tracked file.
On the default branch, the workflow
can be run manually and is scheduled daily at 01:17 UTC. The time is provisional
and allows a buffer after the midnight UTC reset reported by WardogsHub.
GitHub scheduled runs may be delayed or dropped; public repositories' schedules
are disabled after 60 days without repository activity.

This version sends a price-only embed with the quote date and source in the
footer. Discord confirms delivery through `wait=true`. Uncertain sends are not
retried automatically to avoid duplicates; check the channel before rerunning.
Each manual or daily run sends a new message; no history or duplicate detection
is stored yet. A change to WardogsHub's page structure can require updating the
parser. No official Bulkhead gold-price endpoint has been verified.

Source: https://wardogshub.gg/gold-market/
Schedule behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

The earlier Python `gold.py` is retained as a legacy reference. The daily workflow
runs the Node.js implementation above.

## Development

Work on the `dev` branch. In Actions, open **Post WARDOGS gold price**, click
**Run workflow**, select `dev` in the branch dropdown, then run it. Development
runs use only `DISCORD_WEBHOOK_URL_DEV`; a missing dev secret fails instead of
falling back to production. Manual runs on `main` use `DISCORD_WEBHOOK_URL`.
Daily scheduled posts run only on `main`. The branch-aware workflow can be
merged into `main` when ready; changes here do not alter `main` until merged.
