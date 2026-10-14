import test from 'node:test';
import assert from 'node:assert/strict';
import {planSavings} from './planner/model.mjs';
test('preserves reserve and counts only whole bars needed for the goal',()=>{
  const p=planSavings({targetBars:30,ownedBars:18,cash:3500000,reserve:1000000,price:281880});
  assert.equal(p.remainingBars,12);assert.equal(p.affordableBars,8);
  assert.equal(p.cost,3382560);assert.equal(p.cashAfter,1244960);assert.equal(p.shortfall,882560);
});
test('handles completed goals and cash below reserve',()=>{
  assert.equal(planSavings({targetBars:5,ownedBars:10,cash:100,reserve:200,price:100}).affordableBars,0);
  assert.equal(planSavings({targetBars:5,ownedBars:0,cash:100,reserve:200,price:100}).shortfall,500);
});
test('rejects negative balances, fractions and zero prices',()=>{
  for (const patch of [{cash:-1},{ownedBars:1.5},{price:0},{cash:NaN}]) {
    assert.throws(()=>planSavings({targetBars:30,ownedBars:0,cash:3000000,reserve:1000000,price:100,...patch}));
  }
});
