import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.mjs';
import { FIXTURES } from '../src/fixtures.mjs';
import { parseDataset, analyzeOpportunity } from '../../market-data.mjs';

const base = 'https://backend.invalid';
const origin = 'https://tonyramage410-hub.github.io';
const query = 'game=FC27&platform=ps&version=TEST%20TOTW&finish=standard';
const req = (path, init) => new Request(base + path, init);
const run = (path, init, env = {}) => worker.fetch(req(path, init), env, {});
const body = async (path, init, env) => (await run(path, init, env)).json();
const code = async (path, status, expected, init) => {
  const res = await run(path, init);
  assert.equal(res.status, status, path);
  assert.equal((await res.json()).error.code, expected, path);
};

test('status hard-disables providers, credits, EA, automation and writes even with hostile env', async () => {
  const result = await body('/v1/status', undefined, {
    PROVIDER_ENABLED:'true', PARSE_API_KEY:'SYNTHETIC-SECRET-DO-NOT-USE',
    APPROVAL_WRITES_ENABLED:'true', RELEASE:'SYNTHETIC-SECRET-DO-NOT-USE'
  });
  for (const key of ['providerRequestsEnabled','realMarketConnected','eaConnected','tradingAutomationEnabled','approvalWritesEnabled'])
    assert.equal(result[key], false, key);
  assert.equal(result.providerCreditBudget, 0);
  assert.equal(result.ownerAuthentication, 'not-configured');
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC-SECRET|PARSE_API_KEY/);
});
test('demo listing is visibly synthetic and keeps exact card versions/platforms separate', async () => {
  const result = await body('/v1/demo/cards?game=FC27');
  assert.equal(result.count,4);
  assert.equal(result.synthetic,true);
  assert.match(result.notice,/Not real players/);
  const keys=result.cards.map(c=>JSON.stringify([c.cardId,c.platform,c.version,c.finish]));
  assert.equal(new Set(keys).size,4);
  assert.ok(result.cards.every(c=>c.ownerApproval==='not-approved' && c.synthetic));
});
test('synthetic fixture contract stays compatible with M4 but cannot qualify for real opportunity', () => {
  const c=parseDataset(JSON.stringify({schemaVersion:1,cards:FIXTURES})).cards[0];
  const result=analyzeOpportunity(c,{purchase:900,undercut:100,minProfit:75,balance:30000,committed:0,allocationPct:30,cardExposurePct:10,quantity:1});
  assert.equal(result.eligible,false);
  assert.equal(c.ticksVerified,false);
  assert.equal(c.source.permittedUseConfirmed,false);
});
test('search matches ID/name and exact platform/version/finish filters', async () => {
  const result=await body('/v1/demo/cards?'+query+'&q=TEST-001');
  assert.equal(result.count,1);
  assert.equal(result.cards[0].platform,'ps');
  assert.equal((await body('/v1/demo/cards?game=FC27&q=absent')).count,0);
  assert.equal((await body('/v1/demo/cards?game=FC27&finish=holographic')).count,1);
});
test('quote requires full identity and rejects cross-platform missing identities', async () => {
  await code('/v1/demo/cards/TEST-001/quote?game=FC27',400,'invalid_query');
  await code('/v1/demo/cards/TEST-001/quote?'+query.replace('platform=ps','platform=switch'),404,'exact_card_not_found');
  const r=await body('/v1/demo/cards/TEST-001/quote?'+query);
  assert.equal(r.card.price,1200);
  assert.equal(r.approved,false);
});
test('fixture timestamp is fixed across requests; null price remains unavailable', async () => {
  const a=await body('/v1/demo/cards/TEST-001/quote?'+query);
  const b=await body('/v1/demo/cards/TEST-001/quote?'+query);
  assert.equal(a.card.observedAt,'2026-10-01T12:00:00Z');
  assert.equal(a.card.observedAt,b.card.observedAt);
  const missing=await body('/v1/demo/cards/TEST-001/quote?'+query.replace('platform=ps','platform=xbox'));
  assert.equal(missing.card.price,null);
  assert.equal(missing.card.freshness.status,'unavailable');
});
test('history stays bound to exact identity and separately labelled as synthetic averages', async () => {
  const r=await body('/v1/demo/cards/TEST-001/history?'+query);
  assert.equal(r.history.length,3);
  assert.ok(r.history.every(p=>p.kind==='hourly-average'&&JSON.parse(p.cardKey)[5]==='ps'));
  assert.equal(r.synthetic,true);
  assert.equal(r.risk.status,'high');
});
test('real routes always return provider_disabled, never a synthetic fallback', async () => {
  for (const p of ['/v1/cards','/v1/cards?game=FC27','/v1/cards/TEST-001/quote?'+query,'/v1/cards/TEST-001/history?'+query])
    await code(p,503,'provider_disabled');
});
test('owner operations are locked even with forged JWT, reviewer, cookie or approval', async () => {
  const headers={'Content-Type':'application/json','Cf-Access-Jwt-Assertion':'fake','Cookie':'owner=true','Authorization':'Bearer fake','X-Owner':'Luke'};
  await code('/v1/owner/reviews',423,'owner_writes_locked',{method:'POST',headers,body:'{"approved":true,"reviewer":"owner"}'});
  await code('/v1/owner/reviews/123/decision',423,'owner_writes_locked',{method:'POST',headers,body:'{"decision":"approve"}'});
  await code('/v1/owner/session',503,'owner_auth_not_configured',{headers});
  assert.deepEqual((await body('/v1/approvals')).approvals,[]);
});
test('writes and trade/proxy/provider paths are unavailable', async () => {
  for(const method of ['POST','PUT','PATCH','DELETE']) await code('/v1/demo/cards',405,'method_not_allowed',{method,body:'do-not-store'});
  for(const p of ['/trade','/v1/bid','/v1/ea/login','/v1/parse','/proxy','/v1/fetch']) await code(p,404,'not_found');
});
test('origin checks are exact and credentialed CORS is absent', async () => {
  for(const o of ['null','https://evil.invalid','https://tonyramage410-hub.github.io.evil.invalid','http://tonyramage410-hub.github.io'])
    await code('/v1/status',403,'origin_not_allowed',{headers:{Origin:o}});
  const r=await run('/v1/status',{headers:{Origin:origin}});
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
  assert.equal((await run('/v1/status')).headers.get('Access-Control-Allow-Origin'),null);
});
test('preflights allow only known public read-only paths with no extra auth headers', async () => {
  const headers={Origin:origin,'Access-Control-Request-Method':'GET'};
  const r=await run('/v1/status',{method:'OPTIONS',headers});
  assert.equal(r.status,204); assert.equal(await r.text(),'');
  await code('/v1/status',403,'preflight_not_allowed',{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Method':'POST'}});
  await code('/v1/status',403,'preflight_not_allowed',{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Headers':'authorization'}});
  await code('/unknown',404,'not_found',{method:'OPTIONS',headers});
});
test('strict query validation blocks ambiguity, unexpected fields, controls and URL injection', async () => {
  for(const suffix of ['game=FC26','game=FC27&game=FC27','game=FC27&platform=console','game=FC27&finish=gold',
    'game=FC27&q=%00','game=FC27&q=%3Cscript%3E','game=FC27&q='+'a'.repeat(65),
    'game=FC27&version='+'a'.repeat(61),'game=FC27&url=https://parse.bot','game=FC27&approved=true','game=FC27&apiKey=test'])
    await code('/v1/demo/cards?'+suffix,400,'invalid_query');
  await code('/v1/status?token=TEST-SHOULD-NOT-ECHO',400,'invalid_query');
});
test('path and protocol validation block encoded slashes, upgrades and oversized URLs', async () => {
  await code('/v1/demo/cards/TEST%2f001/quote?'+query,400,'invalid_path');
  await code('/v1/status?x='+'a'.repeat(2048),414,'url_too_long');
  await code('/v1/status',400,'upgrade_not_supported',{headers:{Upgrade:'websocket'}});
  assert.equal((await worker.fetch(new Request('http://evil.invalid/v1/status'))).status,400);
  assert.equal((await worker.fetch(new Request('http://127.0.0.1/v1/status'))).status,200);
});
test('all responses have anti-sniff, no-store, restrictive CSP and no cookies', async () => {
  for(const p of ['/','/v1/status','/v1/demo/cards?game=FC27','/v1/cards','/invalid']){
    const r=await run(p);
    assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
    assert.match(r.headers.get('Cache-Control'),/no-store/);
    assert.match(r.headers.get('Content-Security-Policy'),/default-src 'none'/);
    assert.equal(r.headers.get('Set-Cookie'),null);
    assert.doesNotMatch(await r.text(),/stack|SYNTHETIC-SECRET/);
  }
});
test('HEAD responses are bodyless and preserve status and content type', async () => {
  for(const p of ['/','/v1/status','/v1/cards','/v1/demo/cards?game=FC27']){
    const h=await run(p,{method:'HEAD'}),g=await run(p);
    assert.equal(h.status,g.status); assert.equal(await h.text(),'');
    assert.equal(h.headers.get('Content-Type'),g.headers.get('Content-Type'));
  }
});
test('global outbound request trap remains untouched across all supported routes and hostile flags', async () => {
  const original=globalThis.fetch; let calls=0;
  globalThis.fetch=()=>{calls++;throw Error('outbound access forbidden');};
  try {
    for(const p of ['/','/v1/status','/v1/cards','/v1/approvals','/v1/demo/cards?game=FC27',
      '/v1/demo/cards/TEST-001/quote?'+query,'/v1/demo/cards/TEST-001/history?'+query,'/v1/owner/session'])
      await run(p,undefined,{PROVIDER_ENABLED:'true',PARSE_API_KEY:'TEST'});
    assert.equal(calls,0);
  } finally {globalThis.fetch=original;}
});
test('deployment configuration has no resources, jobs, credentials or paid dependencies', () => {
  const cfg=JSON.parse(readFileSync(new URL('../wrangler.json',import.meta.url),'utf8'));
  for(const k of ['account_id','routes','kv_namespaces','d1_databases','durable_objects','queues','r2_buckets','hyperdrive','services','triggers','containers'])
    assert.equal(Object.hasOwn(cfg,k),false,k);
  assert.equal(cfg.send_metrics,false); assert.equal(cfg.observability.enabled,false);
  assert.equal(cfg.preview_urls,false);
  const source=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:XMLHttpRequest|WebSocket)\s*\(|console\.|scheduled\s*\(|eval\s*\(/);
  // The one fetch definition is Workers' inbound handler, not an outbound call.
  assert.equal((source.match(/\bfetch\s*\(/g)??[]).length,1);
  assert.match(source,/async fetch\(request, _env, _ctx\)/);
  assert.ok(Object.isFrozen(FIXTURES[0].source));
});
