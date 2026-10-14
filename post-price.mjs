import { pathToFileURL } from 'node:url';
import { getPrice } from './get-price.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { analyzeHistory, cash, percent } from './analyze-history.mjs';
import { renderChart } from './chart.mjs';

export function buildEmbed(quote, analysis = analyzeHistory(quote), hasChart = false) {
  const rank = window => window.complete ? `${window.percentile.toFixed(0)}th percentile (lower is cheaper)` : `Unavailable (${window.count}/${window.days} quotes)`;
  const daily = analysis.daily ? `${analysis.daily.cash >= 0 ? '+' : '-'}${cash(Math.abs(analysis.daily.cash))} (${percent(analysis.daily.percent)})` : 'Unavailable';
  return {
    username: 'WARDOGS Gold Bars',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: 'WARDOGS Gold Bar Exchange',
      description: `**$${quote.price.toLocaleString('en-US')}** in-game cash per gold bar`,
      color: {Favorable: 0x22c55e, Typical: 0xD4AF37, Expensive: 0xef4444}[analysis.label] ?? 0x94a3b8,
      url: quote.source,
      footer: { text: `Quote: ${quote.quote_date} UTC | WardogsHub (unofficial)` },
      fields: [
        {name: 'Since yesterday', value: daily, inline: true},
        {name: 'Previous 14-day median', value: analysis.recent.complete ? `${cash(analysis.recent.median)}\nToday: ${percent(analysis.recent.medianDifference)} vs median` : 'Unavailable', inline: true},
        {name: 'Recent price ranking', value: `14 days: ${rank(analysis.recent)}\n30 days: ${rank(analysis.month)}`, inline: false},
        {name: 'Previous 30-day range', value: analysis.month.complete ? `${cash(analysis.month.min)} – ${cash(analysis.month.max)}` : 'Unavailable', inline: true},
        {name: `Exchange assessment: ${analysis.label}`, value: analysis.explanation, inline: false},
        {name: 'Before exchanging', value: 'Keep cash for gameplay and consider your cosmetic deadline. Exchanges are one-way and non-refundable.', inline: false},
      ],
      ...(hasChart ? {image: {url: 'attachment://history.png'}} : {}),
    }],
  };
}

export async function postPrice(quote, webhook, fetchFn = fetch, chart = null, analysis = analyzeHistory(quote)) {
  let url;
  try { url = new URL(webhook); } catch { throw new Error('Set a valid DISCORD_WEBHOOK_URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'discord.com' ||
      !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)) {
    throw new Error('DISCORD_WEBHOOK_URL must be a Discord HTTPS webhook URL.');
  }
  url.searchParams.set('wait', 'true');
  let response;
  const payload = buildEmbed(quote, analysis, Boolean(chart));
  let body, headers;
  if (chart) {
    payload.attachments = [{id: 0, filename: 'history.png', description: 'Daily cash cost per gold bar; lower is cheaper.'}];
    body = new FormData();
    body.set('payload_json', JSON.stringify(payload));
    body.set('files[0]', new Blob([chart], {type: 'image/png'}), 'history.png');
    headers = {};
  } else {
    body = JSON.stringify(payload);
    headers = {'Content-Type': 'application/json'};
  }
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    });
  } catch {
    // Do not expose the secret URL in network errors or retry an uncertain send.
    throw new Error('Discord request failed; delivery is uncertain. Check the channel before rerunning.');
  }
  if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}.`);
  const message = await response.json();
  if (!message.id) throw new Error('Discord did not confirm a message ID.');
  return message.id;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const dryRun = process.argv.includes('--dry-run');
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!dryRun && !webhook) throw new Error('Set DISCORD_WEBHOOK_URL before posting.');
    const quote = await getPrice();
    const fetchedAt = new Date().toISOString();
    await mkdir('output', {recursive: true});
    // Archive the complete source dataset before analysis; no secrets are stored.
    await writeFile(`output/quote-${quote.quote_date}.json`, JSON.stringify({...quote, fetched_at: fetchedAt}, null, 2));
    const analysis = analyzeHistory(quote, process.env.HISTORY_START_DATE);
    const chart = await renderChart(analysis);
    await writeFile('output/history.png', chart);
    await writeFile('output/embed.json', JSON.stringify(buildEmbed(quote, analysis, true), null, 2));
    if (dryRun) console.log(JSON.stringify(buildEmbed(quote, analysis, true), null, 2));
    else console.log(`Discord confirmed message ${await postPrice(quote, webhook, fetch, chart, analysis)}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
