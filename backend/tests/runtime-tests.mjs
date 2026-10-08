import worker from './worker.js';
const origin='https://tonyramage410-hub.github.io';
const q='game=FC27&platform=ps&version=TEST%20TOTW&finish=standard';
const verify=(value,message)=>{if(!value)throw Error(message);};
const run=(path,init)=>worker.fetch(new Request('https://backend.invalid'+path,init),{PROVIDER_ENABLED:'true'},{});
const data=async(path,init)=>(await run(path,init)).json();
export const status={async test(){
  const s=await data('/v1/status');verify(s.providerRequestsEnabled===false&&s.providerCreditBudget===0&&!s.eaConnected&&!s.tradingAutomationEnabled&&!s.approvalWritesEnabled,'closed gates');
}};
export const exactIdentities={async test(){
  const c=await data('/v1/demo/cards?game=FC27');verify(c.count===4&&c.synthetic,'synthetic catalogue');
  const x=await data('/v1/demo/cards/TEST-001/quote?'+q);verify(x.card.price===1200&&x.card.platform==='ps'&&!x.approved,'exact quote');
}};
export const missingAndHistory={async test(){
  const n=await data('/v1/demo/cards/TEST-001/quote?'+q.replace('platform=ps','platform=xbox'));verify(n.card.price===null&&n.card.freshness.status==='unavailable','null price');
  const h=await data('/v1/demo/cards/TEST-001/history?'+q);verify(h.history.length===3&&h.synthetic,'labelled history');
}};
export const noRealFallback={async test(){
  const r=await run('/v1/cards');verify(r.status===503&&(await r.json()).error.code==='provider_disabled','real route closed');
}};
export const lockedOwner={async test(){
  const r=await run('/v1/owner/reviews',{method:'POST',body:'{"approved":true}',headers:{'X-Owner':'owner'}});verify(r.status===423,'owner locked');
  const a=await data('/v1/approvals');verify(a.approvals.length===0&&!a.writesEnabled,'empty approvals');
}};
export const corsAndPreflight={async test(){
  const r=await run('/v1/status',{headers:{Origin:origin}});verify(r.headers.get('Access-Control-Allow-Origin')===origin&&!r.headers.get('Access-Control-Allow-Credentials'),'CORS');
  verify((await run('/v1/status',{headers:{Origin:'https://evil.invalid'}})).status===403,'foreign origin denied');
  const p=await run('/v1/status',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET'}});verify(p.status===204&&(await p.text())==='','empty preflight');
}};
export const strictInputs={async test(){
  for(const path of ['/v1/demo/cards?game=FC27&game=FC27','/v1/demo/cards?game=FC27&url=https://parse.bot'])verify((await run(path)).status===400,'bad query');
  verify((await run('/proxy')).status===404,'no proxy');
}};
export const headersAndHead={async test(){
  const r=await run('/v1/status',{method:'HEAD'});verify(r.status===200&&(await r.text())==='','HEAD');
  verify(r.headers.get('X-Content-Type-Options')==='nosniff'&&r.headers.get('Cache-Control').includes('no-store'),'headers');
  verify((await (await run('/')).text()).includes('All provider requests disabled'),'scope page');
}};
