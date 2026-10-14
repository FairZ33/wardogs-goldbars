export function alertSettings(env = process.env) {
  const maxPrice = env.GOLD_ALERT_MAX_PRICE ? Number(env.GOLD_ALERT_MAX_PRICE) : null;
  if (maxPrice !== null && (!Number.isSafeInteger(maxPrice) || maxPrice <= 0)) throw new Error('GOLD_ALERT_MAX_PRICE must be a positive whole cash amount.');
  const roleId = env.GOLD_ALERT_ROLE_ID || null;
  if (roleId && !/^\d{17,20}$/.test(roleId)) throw new Error('GOLD_ALERT_ROLE_ID must be a Discord role ID.');
  return {maxPrice, roleId};
}

export function evaluateAlerts(quote, analysis, previous = null, settings = {}) {
  if (previous && (previous.version !== 1 || typeof previous.conditions !== 'object' || !previous.conditions)) {
    throw new Error('Saved alert state is invalid; refusing to guess whether an alert was already sent.');
  }
  const config = JSON.stringify({maxPrice:settings.maxPrice ?? null, start:analysis.startDate});
  const prior = previous?.config === config ? previous.conditions : {};
  const conditions = {
    favorable: analysis.recent.complete ? analysis.recent.percentile <= 25 : null,
    ceiling: settings.maxPrice == null ? null : quote.price <= settings.maxPrice,
  };
  const reasons = [];
  if (conditions.favorable === true && prior.favorable !== true) reasons.push('Gold entered the cheapest quarter of the previous 14 days.');
  if (conditions.ceiling === true && prior.ceiling !== true) reasons.push(`Gold reached your cash-per-bar ceiling of $${settings.maxPrice.toLocaleString('en-US')}.`);
  // Unknown observations preserve previous state; a data gap must not reset an alert.
  const next = {version:1, config, quote_date:quote.quote_date, conditions:{
    favorable:conditions.favorable ?? prior.favorable ?? null,
    ceiling:conditions.ceiling ?? prior.ceiling ?? null,
  }};
  const roleId = settings.roleId ?? null;
  return {reasons, state:next, message: reasons.length ? {
    content: `${roleId ? `<@&${roleId}> ` : ''}**Gold price alert**\n${reasons.join('\n')}`,
    allowed_mentions: {parse:[], roles:roleId ? [roleId] : []},
  } : null};
}
