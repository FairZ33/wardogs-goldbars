import sharp from 'sharp';
import { cash } from './analyze-history.mjs';

export async function renderChart(analysis) {
  const rows = analysis.chartRows;
  if (!rows.length) throw new Error('No dated quotes available for chart.');
  const W = 1000, H = 400, left = 110, right = 960, top = 70, bottom = 320;
  const first = Date.parse(rows[0].date), last = Date.parse(rows.at(-1).date);
  const rates = rows.map(row => row.rate);
  const low = Math.min(...rates), high = Math.max(...rates);
  const padding = Math.max((high - low) * 0.12, high * 0.02, 1);
  const min = Math.max(0, low - padding), max = high + padding;
  const x = row => left + (Date.parse(row.date) - first) / Math.max(last - first, 86400000) * (right - left);
  const y = rate => bottom - (rate - min) / (max - min) * (bottom - top);
  const text = (x, y, value, size = 18, color = '#cbd5e1', anchor = 'start') =>
    `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" text-anchor="${anchor}">${value}</text>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#111827"/>`;
  svg += text(left, 34, 'WARDOGS cash per gold bar', 25, '#f8fafc');
  svg += text(right, 34, 'Lower is cheaper', 17, '#94a3b8', 'end');
  for (let i = 0; i <= 4; i++) {
    const rate = min + (max - min) * i / 4, yy = y(rate);
    svg += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="#334155"/>`;
    svg += text(left - 10, yy + 6, cash(rate), 15, '#94a3b8', 'end');
  }
  if (analysis.recent.complete) {
    const yy = y(analysis.recent.median);
    svg += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="#60a5fa" stroke-dasharray="7 5"/>`;
  }
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    // Leave gaps visible instead of inventing observations between missing dates.
    if (prev && Date.parse(row.date) - Date.parse(prev.date) === 86400000) {
      svg += `<line x1="${x(prev)}" y1="${y(prev.rate)}" x2="${x(row)}" y2="${y(row.rate)}" stroke="#eab308" stroke-width="3"/>`;
    }
    svg += `<circle cx="${x(row)}" cy="${y(row.rate)}" r="${i === rows.length - 1 ? 5 : 2}" fill="#facc15"/>`;
  });
  svg += text(left, 350, rows[0].date, 16);
  svg += text(right, 350, rows.at(-1).date, 16, '#cbd5e1', 'end');
  svg += text(left, 385, `${rows.length} daily quotes | WardogsHub (unofficial)`, 16, '#94a3b8');
  if (analysis.recent.complete) svg += text(right, 385, 'Dashed: previous 14-day median', 16, '#60a5fa', 'end');
  svg += '</svg>';
  return sharp(Buffer.from(svg)).png().toBuffer();
}
