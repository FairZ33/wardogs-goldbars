import { pathToFileURL } from 'node:url';
import { getPrice } from './get-price.mjs';

export function buildEmbed(quote) {
  return {
    username: 'WARDOGS Gold Bars',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: 'WARDOGS Gold Bar Price',
      description: `**$${quote.price.toLocaleString('en-US')}** in-game cash per gold bar`,
      color: 0xD4AF37,
      url: quote.source,
      footer: { text: `Quote: ${quote.quote_date} UTC | WardogsHub (unofficial)` },
    }],
  };
}

export async function postPrice(quote, webhook, fetchFn = fetch) {
  let url;
  try { url = new URL(webhook); } catch { throw new Error('Set a valid DISCORD_WEBHOOK_URL.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'discord.com' ||
      !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)) {
    throw new Error('DISCORD_WEBHOOK_URL must be a Discord HTTPS webhook URL.');
  }
  url.searchParams.set('wait', 'true');
  let response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEmbed(quote)),
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
    if (dryRun) console.log(JSON.stringify(buildEmbed(quote), null, 2));
    else console.log(`Discord confirmed message ${await postPrice(quote, webhook)}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
