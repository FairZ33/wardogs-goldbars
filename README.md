# 💰 WARDOGS Gold Bar Market Tracker

An automated tool that scrapes live WARDOGS Gold Bar exchange rates and historical statistics from [WardogsHub](https://wardogshub.gg/gold-market/) and posts rich notifications directly to a Discord channel via Webhooks[cite: 1].

---

## 🚀 Features

* **📅 Today's Rate:** Live cash price per gold bar.
* **⏪ Yesterday's Price:** Dynamically calculated based on daily market shifts[cite: 1].
* **📈 Highest Ever:** Tracks the all-time peak exchange rate[cite: 1].
* **📉 Lowest Ever:** Tracks the all-time market bottom[cite: 1].
* **🤖 Fully Automated:** Runs on a daily cron schedule via GitHub Actions[cite: 1].
* **💸 100% Free:** Runs entirely on GitHub's free tier with zero server maintenance.

---

## 🛠️ Tech Stack

* **Language:** Python 3.10+[cite: 1]
* **Parsing:** BeautifulSoup4[cite: 1]
* **Network Requests:** Requests[cite: 1]
* **Automation:** GitHub Actions (YAML)[cite: 1]
* **Notifications:** Discord Webhooks (Embeds)[cite: 1]

---

## 📦 Quick Setup Guide

If you want to set up your own instance of this tracker, follow these steps:

### 1. Fork or Copy the Files
* Fork this repository to your own GitHub account, or create a new repository containing:
  * `gold.py` (The main scraping and notification script)
  * `.github/workflows/daily.yml` (The automation workflow file)

### 2. Add Your Discord Webhook Secret
1. Go to your repository's **Settings**.
2. In the left sidebar, click **Secrets and variables** -> **Actions**.
3. Click **New repository secret**.
4. Set the **Name** to: `DISCORD_WEBHOOK_URL`
5. Paste your Discord channel Webhook URL into the **Secret** field and click **Add secret**.

### 3. Enable GitHub Actions
If you forked the repository, GitHub disables scheduled workflows by default for security:
1. Go to the **Actions** tab in your repository.
2. Click the green button to **Enable workflows**.

---

## 🔄 Manual Testing & Usage

The script is configured to run automatically every day at midnight UTC (`5 0 * * *`)[cite: 1]. However, you can trigger a manual update at any time:

1. Go to your repository's **Actions** tab.
2. Select **Post Wardogs Gold Price** in the left sidebar.
3. Click the **Run workflow** dropdown and click **Run workflow**.
