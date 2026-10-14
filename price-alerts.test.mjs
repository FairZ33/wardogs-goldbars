import test from 'node:test';
import assert from 'node:assert/strict';
import {alertSettings,evaluateAlerts} from './price-alerts.mjs';
const q={price:200000,quote_date:'2026-10-14'};
const analysis=(rank=10,complete=true)=>({startDate:'2026-09-10',recent:{complete,percentile:rank}});
test('alerts on entry, suppresses repeats and rearms after exit',()=>{
  const first=evaluateAlerts(q,analysis());
  assert.equal(first.reasons.length,1);
  assert.equal(evaluateAlerts(q,analysis(),first.state).message,null);
  const exit=evaluateAlerts(q,analysis(50),first.state);
  assert.equal(evaluateAlerts(q,analysis(),exit.state).reasons.length,1);
});
test('missing history cannot rearm a favorable alert',()=>{
  const active=evaluateAlerts(q,analysis()).state;
  const gap=evaluateAlerts(q,analysis(0,false),active);
  assert.equal(gap.message,null);
  assert.equal(evaluateAlerts(q,analysis(),gap.state).message,null);
});
test('price ceiling works independently and mentions only the configured role',()=>{
  const result=evaluateAlerts(q,analysis(0,false),null,{maxPrice:200000,roleId:'123456789012345678'});
  assert.equal(result.reasons.length,1);
  assert.deepEqual(result.message.allowed_mentions,{parse:[],roles:['123456789012345678']});
});
test('rejects invalid settings and damaged persisted state',()=>{
  assert.throws(()=>alertSettings({GOLD_ALERT_MAX_PRICE:'garbage'}));
  assert.throws(()=>alertSettings({GOLD_ALERT_ROLE_ID:'@everyone'}));
  assert.throws(()=>evaluateAlerts(q,analysis(),{}));
});
