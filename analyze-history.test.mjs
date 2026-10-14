import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHistory } from './analyze-history.mjs';
import { renderChart } from './chart.mjs';
const date = '2026-10-14';
const series = rates => rates.map((rate, i) => ({rate, date: new Date(Date.parse(date) - (rates.length - i) * 86400000).toISOString().slice(0,10)}));
const quote = (price, rates) => ({price, quote_date: date, history: [...series(rates), {date,rate:price}]});

test('uses only prior dates, with midpoint ranks for ties', () => {
  const a = analyzeHistory(quote(100, Array(30).fill(100)));
  assert.equal(a.recent.median, 100);
  assert.equal(a.recent.percentile, 50);
  assert.equal(a.label, 'Typical');
  assert.equal(a.daily.cash, 0);
});
test('calculates a known median and rank without including today', () => {
  const a = analyzeHistory(quote(5, Array.from({length:30}, (_,i)=>i+1)));
  assert.equal(a.recent.median, 23.5);
  assert.equal(a.month.median, 15.5);
  assert.equal(a.recent.percentile, 0);
  assert.equal(a.label, 'Favorable');
});
test('identifies expensive rates', () => {
  assert.equal(analyzeHistory(quote(200, Array(30).fill(100))).label, 'Expensive');
});
test('suppresses incomplete and reset-crossing comparisons', () => {
  const q = quote(100, Array(30).fill(100));
  q.history = q.history.filter(row => row.date !== '2026-10-08');
  assert.equal(analyzeHistory(q).label, 'Insufficient data');
  assert.equal(analyzeHistory(quote(100, Array(30).fill(100)), '2026-10-10').recent.count, 4);
});
test('reports disagreement between comparison windows', () => {
  const a = analyzeHistory(quote(200, [...Array(16).fill(1000), ...Array(14).fill(100)]));
  assert.equal(a.label, 'Expensive');
  assert.match(a.explanation, /windows disagree/);
});
test('future observations do not influence the assessment', () => {
  const q = quote(100, Array(30).fill(100));
  const before = analyzeHistory(q);
  q.history.push({date:'2026-10-15',rate:1000000});
  assert.deepEqual(analyzeHistory(q), before);
});
test('renders a PNG even for a flat market or a single quote', async () => {
  for (const rates of [[], Array(30).fill(100)]) {
    const png = await renderChart(analyzeHistory(quote(100, rates)));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
  }
});
