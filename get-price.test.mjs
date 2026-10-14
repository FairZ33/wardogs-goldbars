import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice } from './get-price.mjs';

const now = new Date('2026-10-14T12:00:00Z');
const page = rows => `<script type="application/json" data-gold-series>${JSON.stringify(rows)}</script>`;

test('selects the current quote even when history is unsorted', () => {
  assert.equal(parsePrice(page([{date:'2026-10-14',rate:281880},{date:'2026-10-13',rate:229361}]), now).price, 281880);
});
test('rejects stale and future quotes', () => {
  for (const date of ['2026-10-13', '2026-10-15']) {
    assert.throws(() => parsePrice(page([{date,rate:281880}]), now), /unavailable/);
  }
});
test('rejects missing data rather than using a cosmetic price', () => {
  assert.throws(() => parsePrice('<p>$8,456,400</p>', now), /dataset/);
});
test('rejects malformed prices and duplicate dates', () => {
  assert.throws(() => parsePrice(page([{date:'2026-10-14',rate:'281880'}]), now), /Invalid/);
  assert.throws(() => parsePrice(page([{date:'2026-10-14',rate:1},{date:'2026-10-14',rate:2}]), now), /duplicate/);
});
