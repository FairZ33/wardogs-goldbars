import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmbed, postPrice } from './post-price.mjs';

const quote = { price: 281880, quote_date: '2026-10-14', source: 'https://wardogshub.gg/gold-market/' };
const webhook = 'https://discord.com/api/webhooks/123/fake-token';

test('price embed identifies the currency, date and unofficial source without mentions', () => {
  const body = buildEmbed(quote);
  assert.match(body.embeds[0].description, /\$281,880.*in-game cash/);
  assert.match(body.embeds[0].footer.text, /2026-10-14 UTC/);
  assert.equal(body.embeds[0].fields.at(-1).value, '[WardogsHub (unofficial)](https://wardogshub.gg/gold-market/)');
  assert.deepEqual(body.allowed_mentions.parse, []);
});
test('requires Discord confirmation and sends the embed', async () => {
  const id = await postPrice(quote, webhook, async (url, options) => {
    assert.equal(url.searchParams.get('wait'), 'true');
    assert.deepEqual(JSON.parse(options.body), buildEmbed(quote));
    return {ok:true,json:async()=>({id:'456'})};
  });
  assert.equal(id, '456');
});
test('rejects non-Discord URLs before transmitting', async () => {
  await assert.rejects(postPrice(quote, 'https://example.com', () => assert.fail('must not send')), /Discord HTTPS/);
});
test('does not leak the webhook or retry an uncertain send', async () => {
  let calls = 0;
  await assert.rejects(postPrice(quote, webhook, async () => {
    calls++;
    throw new Error(webhook);
  }), error => !error.message.includes('fake-token') && error.message.includes('uncertain'));
  assert.equal(calls, 1);
});
test('fails on HTTP rejection', async () => {
  await assert.rejects(postPrice(quote, webhook, async () => ({ok:false,status:429})), /HTTP 429/);
});
test('uploads the chart as a Discord attachment', async () => {
  await postPrice(quote, webhook, async (url, options) => {
    assert.ok(options.body instanceof FormData);
    const payload = JSON.parse(options.body.get('payload_json'));
    assert.equal(payload.embeds[0].image.url, 'attachment://history.png');
    assert.equal(options.body.get('files[0]').name, 'history.png');
    assert.equal(payload.attachments[0].id, 0);
    assert.equal(options.headers['Content-Type'], undefined);
    return {ok:true,json:async()=>({id:'789'})};
  }, Buffer.from('test chart'));
});
test('adds the planner link and permits only the opted-in alert role', async () => {
  const role='123456789012345678';
  await postPrice(quote,webhook,async(url,options)=>{
    const body=JSON.parse(options.body);
    assert.equal(body.content,`<@&${role}> Gold price alert`);
    assert.deepEqual(body.allowed_mentions,{parse:[],roles:[role]});
    assert.ok(body.embeds[0].fields.some(f=>f.value.includes('https://example.com/planner/')));
    assert.equal(body.embeds[0].fields.at(-1).name,'Source');
    return {ok:true,json:async()=>({id:'999'})};
  },null,undefined,{plannerUrl:'https://example.com/planner/',alert:{content:`<@&${role}> Gold price alert`,allowed_mentions:{parse:[],roles:[role]}}});
});
