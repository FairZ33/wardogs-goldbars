import { pathToFileURL } from 'node:url';

export const SOURCE_URL = 'https://metaforge.app/wardogs/market';
export const SOURCE_NAME = 'MetaForge (unofficial)';
export const API_URL = 'https://metaforge.app/api/wardogs/market';
const EXCHANGE_ID = 'Attribute.Meta.Currency.GoldBars';
const DAY_MS = 86400000;

export function parseHistory(dataset) {
  if (dataset?.exchangeId !== EXCHANGE_ID || !Array.isArray(dataset.points) || !dataset.points.length) {
    throw new Error('MetaForge gold price dataset is empty or invalid.');
  }
  const dates = new Set();
  const rows = dataset.points.map(point => {
    if (!Number.isSafeInteger(point?.t) || point.t <= 0 || point.t % DAY_MS !== 0 ||
        !Number.isSafeInteger(point.price) || point.price <= 0) {
      throw new Error('Invalid timestamp or price in MetaForge gold data.');
    }
    const timestamp = new Date(point.t);
    if (!Number.isFinite(timestamp.valueOf())) throw new Error('Invalid quote date.');
    const date = timestamp.toISOString().slice(0, 10);
    if (dates.has(date)) throw new Error('Invalid or duplicate quote date.');
    dates.add(date);
    return {date, rate: point.price};
  });
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function parsePrice(dataset, now = new Date()) {
  const rows = parseHistory(dataset);
  const latest = rows.at(-1);
  const today = now.toISOString().slice(0, 10);
  if (latest.date !== today) {
    throw new Error(`Current UTC quote unavailable: latest is ${latest.date}, expected ${today}.`);
  }
  return { price: latest.rate, quote_date: latest.date, currency: 'in-game cash', source: SOURCE_URL, official: false, history: rows };
}

export async function getPrice(fetchFn = fetch, now) {
  const response = await fetchFn(API_URL, {
    headers: { 'User-Agent': 'WardogsGoldTracker/0.1', Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`MetaForge price feed returned HTTP ${response.status}.`);
  let dataset;
  try {
    dataset = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error('MetaForge price feed did not return valid JSON.');
  }
  return parsePrice(dataset, now);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await getPrice(), null, 2));
  } catch (error) {
    console.error(`Price fetch failed: ${error.message}`);
    process.exitCode = 1;
  }
}
