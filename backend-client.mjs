import {parseDataset, cardKey} from './market-data.mjs';

// Public synthetic reads only. No configurable URL, credentials, real routes,
// owner routes, writes, persistence, polling or provider fallback.
export const BACKEND_ORIGIN='https://fc-coin-maker-m5-test.tonyramage410.workers.dev';
export class DemoError extends Error {
 constructor(message){super(message);this.name='DemoError';}
}
function query(filters={},exact=false){
 const {query:q='',platform='',version='',finish=''}=filters;
 if(typeof q!=='string'||q.length>64||typeof version!=='string'||version.length>60||/[\x00-\x1f\x7f<>]/.test(q+version)
   ||!['','ps','pc','xbox','switch'].includes(platform)||!['','standard','holographic'].includes(finish)
   ||(exact&&(!platform||!version||!finish)))throw new DemoError('Invalid demo search. Use up to 64 characters and a valid platform, version and finish.');
 const params=new URLSearchParams({game:'FC27'});
 for(const [k,v] of Object.entries({q:exact?'':q,platform,version,finish}))if(v)params.set(k,v);
 return params;
}
function envelope(j){
 if(!j||j.schemaVersion!==1||j.mode!=='synthetic'||j.synthetic!==true||j.realMarketConnected!==false||j.approved!==false)
   throw new DemoError('Backend response was not a safe synthetic demonstration.');
 return j;
}
function cards(values){
 const parsed=parseDataset(JSON.stringify({schemaVersion:1,cards:values})).cards;
 for(let i=0;i<parsed.length;i++){
  const c=parsed[i],raw=values[i];
  if(c.provider!=='synthetic-test'||raw.synthetic!==true||raw.ownerApproval!=='not-approved'||c.ticksVerified!==false||c.source.permittedUseConfirmed!==false)
    throw new DemoError('Unexpected card provenance or approval status.');
 }
 return parsed;
}
export function createDemoClient(request=globalThis.fetch){
 async function read(path,params){
  const url=new URL(path,BACKEND_ORIGIN);if(params)url.search=params.toString();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const r=await request(url.href,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!r.ok)throw new DemoError(`Demo backend returned HTTP ${r.status}. No replacement price was used. Retry when available.`);
   if(!r.headers.get('Content-Type')?.includes('application/json'))throw new DemoError('Demo backend returned an unexpected format.');
   const text=await r.text();if(new TextEncoder().encode(text).length>1000000)throw new DemoError('Demo response exceeds the data limit.');
   return JSON.parse(text);
  }catch(e){if(e instanceof DemoError)throw e;throw new DemoError('Demo request failed or timed out. Check your connection and retry. No offline price was substituted.');}
  finally{clearTimeout(timer);}
 }
 return Object.freeze({
  async status(){
   const j=await read('/v1/status');
   if(j.release!=='m5-synthetic-only'||j.mode!=='synthetic-only'||j.providerCreditBudget!==0
    ||['providerRequestsEnabled','realMarketConnected','eaConnected','tradingAutomationEnabled','approvalWritesEnabled'].some(k=>j[k]!==false))
     throw new DemoError('Backend safety status could not be confirmed. Demo connection stopped.');
   return j;
  },
  async search(filters={}){
   const j=envelope(await read('/v1/demo/cards',query(filters)));
   const found=cards(j.cards);if(j.count!==found.length)throw new DemoError('Demo catalogue count mismatch.');return found;
  },
  async detail(identity){
   if(identity.provider!=='synthetic-test'||identity.game!=='FC27'||! /^[A-Z0-9-]{1,40}$/.test(identity.cardId))throw new DemoError('Invalid exact demo card identity.');
   const params=query(identity,true),path=`/v1/demo/cards/${identity.cardId}`;
   // Both responses must succeed and refer to the same exact card. A failed
   // history request cannot leave a catalogue price displayed as a new quote.
   const [quote,history]=await Promise.all([read(path+'/quote',params),read(path+'/history',params)]);
   envelope(quote);envelope(history);
   if(cardKey(history.identity??{})!==cardKey(identity)||cardKey(quote.card??{})!==cardKey(identity))throw new DemoError('Demo quote/history identity mismatch.');
   return cards([{...quote.card,history:history.history}])[0];
  }
 });
}
