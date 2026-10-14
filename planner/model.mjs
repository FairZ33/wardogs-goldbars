export function planSavings({targetBars, ownedBars, cash, reserve, price}) {
  for (const [name,value] of Object.entries({targetBars,ownedBars,cash,reserve,price})) {
    if (!Number.isSafeInteger(value) || value < 0 || (name === 'price' && value === 0)) throw new Error(`${name} must be a valid non-negative whole number.`);
  }
  const remainingBars = Math.max(0,targetBars-ownedBars);
  const spendable = Math.max(0,cash-reserve);
  const affordableBars = Math.min(remainingBars,Math.floor(spendable/price));
  const cost = remainingBars*price;
  if (!Number.isSafeInteger(cost)) throw new Error('The target is too large to calculate accurately.');
  return {remainingBars,spendable,affordableBars,cost,purchaseCost:affordableBars*price,
    cashAfter:cash-affordableBars*price,shortfall:Math.max(0,cost-spendable),
    progress:targetBars===0 ? 100 : Math.min(100,100*ownedBars/targetBars)};
}
