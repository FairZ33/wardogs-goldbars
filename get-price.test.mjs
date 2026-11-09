import test from 'node:test';
import assert from 'node:assert/strict';
import { API_URL, SOURCE_URL, getPrice, parsePrice } from './get-price.mjs';

const now = new Date('2026-11-09T12:00:00Z');
const point = (date, price) => ({t: Date.parse(date), price});
const feed = points => ({exchangeId: 'Attribute.Meta.Currency.GoldBars', points});

test('normalizes dated MetaForge quotes even when history is unsorted', () => {
  const quote = parsePrice(feed([point('2026-11-09', 281410), point('2026-11-08', 427520)]), now);
  assert.equal(quote.price, 281410);
  assert.equal(quote.quote_date, '2026-11-09');
  assert.equal(quote.source, SOURCE_URL);
  assert.equal(quote.official, false);
  assert.deepEqual(quote.history, [{date:'2026-11-08', rate:427520}, {date:'2026-11-09', rate:281410}]);
});

test('rejects stale and future quotes', () => {
  for (const date of ['2026-11-08', '2026-11-10']) {
    assert.throws(() => parsePrice({...feed([point(date, 281410)]), updatedAt: +now}, now), /unavailable/);
  }
});

test('rejects missing history and unrelated exchange data', () => {
  assert.throws(() => parsePrice(feed([]), now), /dataset/);
  assert.throws(() => parsePrice({points:[point('2026-11-09', 281410)]}, now), /dataset/);
});

test('rejects malformed prices, invalid timestamps, and duplicate dates', () => {
  assert.throws(() => parsePrice(feed([point('2026-11-09', '281410')]), now), /Invalid/);
  assert.throws(() => parsePrice(feed([point('2026-11-09T01:00:00Z', 281410)]), now), /Invalid/);
  assert.throws(() => parsePrice(feed([point('2026-11-09', 1), point('2026-11-09', 2)]), now), /duplicate/);
});

test('requests the MetaForge JSON feed and rejects HTML or HTTP failures', async () => {
  const quote = await getPrice(async (url, options) => {
    assert.equal(url, API_URL);
    assert.equal(options.headers.Accept, 'application/json');
    return Response.json(feed([point('2026-11-09', 281410)]));
  }, now);
  assert.equal(quote.price, 281410);
  await assert.rejects(getPrice(async () => new Response('<html>Just a moment</html>'), now), /valid JSON/);
  await assert.rejects(getPrice(async () => new Response(null, {status: 403}), now), /HTTP 403/);
});
