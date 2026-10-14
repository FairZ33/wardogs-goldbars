import { pathToFileURL } from 'node:url';

export const SOURCE_URL = 'https://wardogshub.gg/gold-market/';

export function parsePrice(html, now = new Date()) {
  const matches = [...html.matchAll(/<script\b[^>]*\bdata-gold-series\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  if (matches.length !== 1) throw new Error('Expected one gold price dataset; the source page may have changed.');
  const rows = JSON.parse(matches[0][1]);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Price dataset is empty or invalid.');
  const dates = new Set();
  for (const row of rows) {
    if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
        !Number.isSafeInteger(row.rate) || row.rate <= 0) {
      throw new Error('Invalid quote in price dataset.');
    }
    const date = new Date(`${row.date}T00:00:00Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== row.date || dates.has(row.date)) {
      throw new Error('Invalid or duplicate quote date.');
    }
    dates.add(row.date);
  }
  const latest = rows.reduce((a, b) => a.date > b.date ? a : b);
  const today = now.toISOString().slice(0, 10);
  if (latest.date !== today) {
    throw new Error(`Current UTC quote unavailable: latest is ${latest.date}, expected ${today}.`);
  }
  return { price: latest.rate, quote_date: latest.date, currency: 'in-game cash', source: SOURCE_URL, official: false };
}

export async function getPrice() {
  const response = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'WardogsGoldTracker/0.1', Accept: 'text/html' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Price source returned HTTP ${response.status}.`);
  return parsePrice(await response.text());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await getPrice(), null, 2));
  } catch (error) {
    console.error(`Price fetch failed: ${error.message}`);
    process.exitCode = 1;
  }
}
