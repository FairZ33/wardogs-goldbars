// Excludes pre-launch history, which WardogsHub says was revised at launch.
export const DEFAULT_HISTORY_START = '2026-09-10';
const dayMs = 86400000;
export const cash = value => `$${value.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
export const percent = value => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

export function analyzeHistory(quote, startDate = DEFAULT_HISTORY_START) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      Number.isNaN(Date.parse(startDate)) || new Date(startDate).toISOString().slice(0, 10) !== startDate) {
    throw new Error('HISTORY_START_DATE must be a valid YYYY-MM-DD date.');
  }
  const time = Date.parse(`${quote.quote_date}T00:00:00Z`);
  const dateAgo = n => new Date(time - n * dayMs).toISOString().slice(0, 10);
  const history = (quote.history ?? []).filter(row => row.date >= startDate && row.date <= quote.quote_date);
  const byDate = new Map(history.map(row => [row.date, row.rate]));
  const window = days => {
    const values = Array.from({length: days}, (_, i) => byDate.get(dateAgo(i + 1)));
    const available = values.filter(value => value !== undefined);
    if (available.length !== days) return {days, count: available.length, complete: false};
    const sorted = [...values].sort((a, b) => a - b);
    const median = days % 2 ? sorted[(days - 1) / 2] : (sorted[days / 2 - 1] + sorted[days / 2]) / 2;
    const lower = values.filter(value => value < quote.price).length;
    const tied = values.filter(value => value === quote.price).length;
    return {days, count: days, complete: true, median, min: sorted[0], max: sorted.at(-1),
      percentile: 100 * (lower + tied / 2) / days,
      medianDifference: 100 * (quote.price / median - 1)};
  };
  const recent = window(14);
  const month = window(30);
  const yesterday = byDate.get(dateAgo(1));
  const daily = yesterday === undefined ? null : {cash: quote.price - yesterday, percent: 100 * (quote.price / yesterday - 1)};
  const category = rank => rank <= 25 ? 'Favorable' : rank >= 75 ? 'Expensive' : 'Typical';
  let label = 'Insufficient data';
  let explanation = `Assessment unavailable: ${recent.count}/14 prior daily quotes within the current economy period.`;
  if (recent.complete) {
    label = category(recent.percentile);
    explanation = `Today ranks at the ${recent.percentile.toFixed(0)}th percentile of the previous 14 days (lower is cheaper), ${Math.abs(recent.medianDifference).toFixed(1)}% ${recent.medianDifference < 0 ? 'below' : recent.medianDifference > 0 ? 'above' : 'from'} the median.`;
    explanation += label === 'Favorable' ? ' Consider exchanging for a cosmetic you want while keeping cash for gameplay.' :
      label === 'Expensive' ? ' If your cosmetic can wait, consider waiting or splitting purchases across days.' :
      ' Reasonable for a cosmetic you want now; no unusually cheap recent rate.';
    if (month.complete && category(month.percentile) !== label) {
      explanation += ` The 30-day comparison is ${category(month.percentile).toLowerCase()}; the windows disagree.`;
    }
  }
  explanation += ' Historical comparison only; it does not predict the next price.';
  const chartRows = history.filter(row => row.date >= dateAgo(30)).sort((a, b) => a.date.localeCompare(b.date));
  return {recent, month, daily, label, explanation, startDate, chartRows};
}
