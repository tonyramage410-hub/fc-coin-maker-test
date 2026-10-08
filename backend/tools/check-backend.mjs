// Only tests this public, synthetic API. Never accepts credentials or provider URLs.
import assert from 'node:assert/strict';
const supplied = process.argv[2] ?? 'http://127.0.0.1:8787';
const base = new URL(supplied);
if (base.username || base.password || base.search || base.hash || base.pathname !== '/'
  || !(base.origin === 'http://127.0.0.1:8787' || (base.protocol === 'https:' && base.hostname.endsWith('.workers.dev')))) {
  console.error('Use the local runtime or the verified FC Coin Maker workers.dev origin, without credentials.');
  process.exit(1);
}
let passed = 0;
const origin = 'https://tonyramage410-hub.github.io';
const query = 'game=FC27&platform=ps&version=TEST%20TOTW&finish=standard';
async function get(path, options) {
  const res = await fetch(new URL(path, base), { ...options, redirect:'error', signal:AbortSignal.timeout(5000) });
  assert.equal(res.headers.get('X-Content-Type-Options'),'nosniff');
  assert.match(res.headers.get('Cache-Control'),/no-store/);
  assert.equal(res.headers.get('Set-Cookie'),null);
  return res;
}
async function check(name, action) {
  await action(); passed++; console.log(`PASS ${name}`);
}
try {
  await check('status: no providers, credits, EA, automation or writes', async()=>{
    const r=await get('/v1/status');assert.equal(r.status,200);const j=await r.json();
    assert.equal(j.release,'m5-synthetic-only');
    for(const k of ['providerRequestsEnabled','realMarketConnected','eaConnected','tradingAutomationEnabled','approvalWritesEnabled']) assert.equal(j[k],false);
    assert.equal(j.providerCreditBudget,0);
  });
  await check('public synthetic catalogue and exact quote', async()=>{
    const r=await get('/v1/demo/cards?game=FC27');assert.equal(r.status,200);
    const j=await r.json();assert.equal(j.count,4);assert.equal(j.synthetic,true);
    const q=await (await get('/v1/demo/cards/TEST-001/quote?'+query)).json();
    assert.equal(q.card.price,1200);assert.equal(q.card.platform,'ps');assert.equal(q.card.observedAt,'2026-10-01T12:00:00Z');
  });
  await check('null price and exact history provenance', async()=>{
    const q=await (await get('/v1/demo/cards/TEST-001/quote?'+query.replace('platform=ps','platform=xbox'))).json();
    assert.equal(q.card.price,null);assert.equal(q.card.freshness.status,'unavailable');
    const h=await (await get('/v1/demo/cards/TEST-001/history?'+query)).json();assert.equal(h.history.length,3);assert.equal(h.synthetic,true);
  });
  await check('real market unavailable rather than synthetic fallback', async()=>{
    const r=await get('/v1/cards');assert.equal(r.status,503);assert.equal((await r.json()).error.code,'provider_disabled');
  });
  await check('owner approval writes locked despite forged identity', async()=>{
    const r=await get('/v1/owner/reviews',{method:'POST',headers:{'X-Owner':'owner'},body:'{"approved":true}'});
    assert.equal(r.status,423);assert.equal((await r.json()).error.code,'owner_writes_locked');
    assert.deepEqual((await (await get('/v1/approvals')).json()).approvals,[]);
  });
  await check('CORS allows public read only and rejects foreign origins', async()=>{
    const r=await get('/v1/status',{headers:{Origin:origin}});assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
    assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
    assert.equal((await get('/v1/status',{headers:{Origin:'https://evil.invalid'}})).status,403);
    const pre=await get('/v1/status',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET'}});
    assert.equal(pre.status,204);assert.equal(await pre.text(),'');
  });
  await check('query injection, duplicate parameters and proxy paths blocked', async()=>{
    for(const p of ['/v1/demo/cards?game=FC27&url=https://parse.bot','/v1/demo/cards?game=FC27&game=FC27']) assert.equal((await get(p)).status,400);
    assert.equal((await get('/proxy')).status,404);
  });
  await check('HEAD no body and documentation labels synthetic scope', async()=>{
    const r=await get('/v1/status',{method:'HEAD'});assert.equal(r.status,200);assert.equal(await r.text(),'');
    const page=await get('/');assert.equal(page.status,200);assert.match(await page.text(),/All provider requests disabled/);
  });
  console.log(`${passed}/8 HTTP runtime checks passed. Target: ${base.origin}`);
} catch {
  console.error(`Backend verification failed after ${passed}/8 checks. No deployment success claimed.`);
  process.exit(1);
}
