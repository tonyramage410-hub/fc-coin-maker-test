import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDemoClient,BACKEND_ORIGIN} from '../backend-client.mjs';
import {FIXTURES} from './demo-fixtures.mjs';
const origin='https://tonyramage410-hub.github.io';
const identity={provider:'synthetic-test',game:'FC27',cardId:'TEST-001',platform:'ps',version:'TEST TOTW',finish:'standard'};
const calls=[];
const request=async(url,options)=>{
 calls.push({url,options});const u=new URL(url),q=u.searchParams;
 if(u.pathname==='/v1/status')return Response.json({release:'m5-synthetic-only',mode:'synthetic-only',providerCreditBudget:0,providerRequestsEnabled:false,realMarketConnected:false,eaConnected:false,tradingAutomationEnabled:false,approvalWritesEnabled:false});
 const found=FIXTURES.filter(c=>(!q.get('q')||(c.name+' '+c.cardId).toLowerCase().includes(q.get('q').toLowerCase()))&&['platform','version','finish'].every(k=>!q.get(k)||q.get(k)===c[k]));
 const envelope={schemaVersion:1,mode:'synthetic',synthetic:true,realMarketConnected:false,approved:false};
 const projected=c=>({...c,history:[],synthetic:true,ownerApproval:'not-approved'});
 if(u.pathname.endsWith('/quote'))return Response.json({...envelope,card:projected(found[0])});
 if(u.pathname.endsWith('/history'))return Response.json({...envelope,identity:found[0],history:found[0].history});
 return Response.json({...envelope,count:found.length,cards:found.map(projected)});
};
test('exact demo client gets catalogue, quote and history against the M5 synthetic response contract',async()=>{
 calls.length=0;const client=createDemoClient(request);await client.status();const catalogue=await client.search();assert.equal(catalogue.length,4);
 const detail=await client.detail(identity);assert.equal(detail.price,1200);assert.equal(detail.history.length,3);assert.equal(detail.observedAt,'2026-10-01T12:00:00Z');
 assert.equal(detail.ticksVerified,false);assert.equal(detail.source.permittedUseConfirmed,false);
 for(const {url,options}of calls){assert.equal(new URL(url).origin,BACKEND_ORIGIN);assert.equal(options.credentials,'omit');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'no-store');assert.equal(options.headers,undefined);}
});
test('platform, version and finish never merge; null price remains unavailable',async()=>{
 const client=createDemoClient(request);
 assert.equal((await client.search({platform:'pc'}))[0].price,1300);
 assert.equal((await client.detail({...identity,version:'TEST GOLD',finish:'holographic'})).price,1000);
 const c=await client.detail({...identity,platform:'xbox'});assert.equal(c.price,null);assert.equal(c.history.length,0);
 assert.deepEqual(await client.search({query:'no such player'}),[]);
});
test('invalid search and proxy/path attempts issue zero requests',async()=>{
 calls.length=0;const client=createDemoClient(request);
 for(const f of [{query:'x'.repeat(65)},{query:'<script>'},{platform:'ps&url=evil'},{finish:'unknown'},{version:'\u0000'}])await assert.rejects(client.search(f));
 await assert.rejects(client.detail({...identity,cardId:'../owner'}));assert.equal(calls.length,0);
});
test('HTTP, offline, malformed JSON and wrong content-type fail without fallback',async()=>{
 for(const req of [async()=>{throw Error('offline');},async()=>new Response('',{status:503}),async()=>new Response('<html>',{headers:{'Content-Type':'text/html'}}),async()=>new Response('{broken',{headers:{'Content-Type':'application/json'}})])await assert.rejects(createDemoClient(req).search());
});
test('security status changes and unsafe synthetic envelopes fail closed',async()=>{
 const modify=mutate=>async(url,opts)=>{const r=await request(url,opts),j=await r.json();mutate(j,url);return Response.json(j);};
 for(const k of ['approvalWritesEnabled','providerRequestsEnabled','eaConnected','tradingAutomationEnabled','realMarketConnected'])await assert.rejects(createDemoClient(modify(j=>j[k]=true)).status());
 await assert.rejects(createDemoClient(modify(j=>j.providerCreditBudget=1)).status());
 for(const mutate of [j=>j.synthetic=false,j=>j.approved=true,j=>j.count=99,j=>j.cards[0].price=0,j=>j.cards[0].ticksVerified=true,j=>j.cards[0].source.permittedUseConfirmed=true])await assert.rejects(createDemoClient(modify(mutate)).search());
});
test('wrong exact quote or history identity and failed history never return detail',async()=>{
 const modify=mutate=>async(url,opts)=>{const r=await request(url,opts),j=await r.json();mutate(j,url);return Response.json(j);};
 await assert.rejects(createDemoClient(modify((j,url)=>{if(url.includes('/quote'))j.card.platform='pc';})).detail(identity));
 await assert.rejects(createDemoClient(modify((j,url)=>{if(url.includes('/history'))j.identity.platform='pc';})).detail(identity));
 await assert.rejects(createDemoClient(async(url,opts)=>url.includes('/history')?new Response('',{status:503}):request(url,opts)).detail(identity));
});
test('frontend keeps credentials, approval writes and arbitrary network access absent',()=>{
 const client=readFileSync(new URL('../backend-client.mjs',import.meta.url),'utf8'),ui=readFileSync(new URL('../market-ui.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(client,/\/v1\/owner|\/v1\/cards|Authorization|Bearer|document\.cookie|localStorage|sessionStorage|WebSocket|XMLHttpRequest|innerHTML/);
 assert.doesNotMatch(ui,/innerHTML|document\.cookie|localStorage|sessionStorage|OWNER_APPROVALS\.(push|splice)/);
 assert.match(ui,/Fictional demo cards cannot be submitted/);
});
