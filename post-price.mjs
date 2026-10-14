import { pathToFileURL } from 'node:url';
import { getPrice } from './get-price.mjs';
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { analyzeHistory, cash, percent } from './analyze-history.mjs';
import { renderChart } from './chart.mjs';
import { alertSettings, evaluateAlerts } from './price-alerts.mjs';

export function buildEmbed(quote, analysis = analyzeHistory(quote), hasChart = false, plannerUrl = null) {
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
      footer: { text: `Quote: ${quote.quote_date} UTC` },
      fields: [
        {name: 'Since yesterday', value: daily, inline: true},
        {name: 'Previous 14-day median', value: analysis.recent.complete ? `${cash(analysis.recent.median)}\nToday: ${percent(analysis.recent.medianDifference)} vs median` : 'Unavailable', inline: true},
        {name: 'Recent price ranking', value: `14 days: ${rank(analysis.recent)}\n30 days: ${rank(analysis.month)}`, inline: false},
        {name: 'Previous 30-day range', value: analysis.month.complete ? `${cash(analysis.month.min)} – ${cash(analysis.month.max)}` : 'Unavailable', inline: true},
        {name: `Exchange assessment: ${analysis.label}`, value: analysis.explanation, inline: false},
        {name: 'Before exchanging', value: 'Keep cash for gameplay and consider your cosmetic deadline. Exchanges are one-way and non-refundable.', inline: false},
        ...(plannerUrl ? [{name:'Plan your cosmetic', value:`[Open the savings planner](${plannerUrl})`, inline:false}] : []),
        {name: 'Source', value: `[WardogsHub (unofficial)](${quote.source})`, inline: false},
      ],
      ...(hasChart ? {image: {url: 'attachment://history.png'}} : {}),
    }],
  };
}

export async function postPrice(quote, webhook, fetchFn = fetch, chart = null, analysis = analyzeHistory(quote), options = {}) {
  let url;
  try { url = new URL(webhook); } catch { throw new Error('Set a valid DISCORD_WEBHOOK_URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'discord.com' ||
      !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)) {
    throw new Error('DISCORD_WEBHOOK_URL must be a Discord HTTPS webhook URL.');
  }
  url.searchParams.set('wait', 'true');
  let response;
  const payload = {...buildEmbed(quote, analysis, Boolean(chart), options.plannerUrl), ...(options.alert ?? {})};
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
    const settings = alertSettings();
    let previous = null;
    try { previous = JSON.parse(await readFile('.state/alert-state.json','utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Could not read saved alert state.'); }
    const alerts = evaluateAlerts(quote, analysis, previous, settings);
    const plannerUrl = process.env.PLANNER_URL || null;
    if (plannerUrl && !/^https:\/\/[a-zA-Z0-9.-]+\//.test(plannerUrl)) throw new Error('PLANNER_URL must be an HTTPS URL.');
    const chart = await renderChart(analysis);
    await writeFile('output/history.png', chart);
    const embed = {...buildEmbed(quote, analysis, true, plannerUrl), ...(alerts.message ?? {})};
    await writeFile('output/embed.json', JSON.stringify(embed, null, 2));
    await cp('planner', 'output/planner', {recursive:true});
    await writeFile('output/planner/current-price.json', JSON.stringify({price:quote.price,quote_date:quote.quote_date,source:quote.source,fetched_at:fetchedAt,assessment:analysis.label},null,2));
    if (dryRun) console.log(JSON.stringify(embed, null, 2));
    else {
      console.log(`Discord confirmed message ${await postPrice(quote, webhook, fetch, chart, analysis, {alert:alerts.message,plannerUrl})}.`);
      await mkdir('.state',{recursive:true});
      await writeFile('.state/alert-state.json',JSON.stringify(alerts.state,null,2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
