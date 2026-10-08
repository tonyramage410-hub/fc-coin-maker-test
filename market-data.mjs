// No network access. Imports are observations, never authenticated provider feeds.
import {isValidPrice, floorTick} from './calculations.mjs';
export const FRESH_SECONDS=300;
export const PLATFORMS=Object.freeze(['ps','xbox','pc','switch']);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max=160)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export const validTime=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19);
export function safeURL(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&text(v,500)?u.href:null;}catch{return null;}}
export function cardKey(c){return JSON.stringify([c.provider,c.game,c.cardId,c.version,c.finish,c.platform]);}
function secretCheck(v,depth=0){
 if(depth>12)throw Error('Import nesting exceeds limit.');
 if(Array.isArray(v)){for(const x of v)secretCheck(x,depth+1);}
 else if(object(v)){for(const [k,x]of Object.entries(v)){if(/token|secret|password|credential|authorization|api.?key|cookie|session|master.?key/i.test(k))throw Error('Import rejected: remove credentials and secret fields.');secretCheck(x,depth+1);}}
 else if(typeof v==='string'&&(/Bearer\s+[a-z0-9._-]+/i.test(v)||/-----BEGIN .*PRIVATE KEY-----/.test(v)))throw Error('Import rejected: credential-like value.');
}
function normalizeCard(c){
 if(!object(c)||c.game!=='FC27'||!text(c.provider,60)||!text(c.cardId,80)||!text(c.name)||!text(c.version,100)||!['standard','holographic'].includes(c.finish)||!PLATFORMS.includes(c.platform)||!integer(c.rating,1,99))throw Error('Each card needs exact FC27 provider ID, name, rating, version, finish and platform.');
 const n=Object.fromEntries(['provider','game','cardId','name','rating','version','finish','platform'].map(k=>[k,c[k]]));
 n.key=cardKey(n);
 if(!object(c.source)||!text(c.source.name,120)||!safeURL(c.source.url)||!text(c.source.endpoint,100)||!validTime(c.source.retrievedAt)||typeof c.source.permittedUseConfirmed!=='boolean')throw Error('Each card needs an HTTPS source, endpoint, retrieval timestamp and permitted-use declaration.');
 n.source={name:c.source.name,url:safeURL(c.source.url),endpoint:c.source.endpoint,retrievedAt:c.source.retrievedAt,permittedUseConfirmed:c.source.permittedUseConfirmed};
 if(c.price!==null&&!isValidPriceStrict(c.price))throw Error('Price must be null or a positive integer using a model tick; zero is unavailable, never a bargain.');
 n.price=c.price;
 if(c.observedAt!==null&&!validTime(c.observedAt))throw Error('Invalid observation time; use UTC ISO or null.');
 n.observedAt=c.observedAt;
 if(!integer(c.uncertaintySeconds,0,86400))throw Error('Observation uncertainty must be a non-negative whole number of seconds.');
 n.uncertaintySeconds=c.uncertaintySeconds;
 if(c.observedAt&&Date.parse(c.observedAt)>Date.parse(n.source.retrievedAt))throw Error('Observation time is after retrieval.');
 if(c.bounds!==null&&(!object(c.bounds)||!isValidPriceStrict(c.bounds.min)||!isValidPriceStrict(c.bounds.max)||c.bounds.min>c.bounds.max))throw Error('Card bounds must be supplied on valid model ticks or null.');
 n.bounds=c.bounds?{min:c.bounds.min,max:c.bounds.max}:null;
 if(typeof c.ticksVerified!=='boolean')throw Error('Declare whether FC27 price increments were independently verified.');
 n.ticksVerified=c.ticksVerified;
 if(!Array.isArray(c.history)||c.history.length>500)throw Error('History must be an array with at most 500 observations.');
 const times=new Set();
 n.history=c.history.map(p=>{
  if(!object(p)||p.cardKey!==n.key||!validTime(p.observedAt)||!integer(p.price,1,15000000)||!['hourly-average','daily-average','observed-bin','completed-sale'].includes(p.kind)||!safeURL(p.sourceURL)||Date.parse(p.observedAt)>Date.parse(n.source.retrievedAt)||times.has(`${p.kind}:${p.observedAt}`))throw Error('History identity, timestamp, price, source or kind is invalid or duplicated.');
  times.add(`${p.kind}:${p.observedAt}`);return {cardKey:n.key,observedAt:p.observedAt,price:p.price,kind:p.kind,sourceURL:safeURL(p.sourceURL)};
 }).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
 return n;
}
export function isValidPriceStrict(v){return integer(v,150,15000000)&&isValidPrice(v);}
export function parseDataset(input){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>1000000)throw Error('Import must be JSON text no larger than 1 MB.');
 const data=JSON.parse(input);secretCheck(data);
 if(!object(data)||data.schemaVersion!==1||!Array.isArray(data.cards)||data.cards.length>200)throw Error('Expected schemaVersion 1 and up to 200 cards.');
 const keys=new Set();const cards=data.cards.map(c=>{const n=normalizeCard(c);if(keys.has(n.key))throw Error('Duplicate exact card/platform identity.');keys.add(n.key);return n;});
 return {schemaVersion:1,cards};
}
export function freshness(c,now=Date.now()){
 if(c.price===null)return {status:'unavailable',ageSeconds:null};
 if(!c.observedAt)return {status:'unknown',ageSeconds:null};
 const t=Date.parse(c.observedAt),retrieved=Date.parse(c.source.retrievedAt);
 if(!Number.isFinite(now)||t>now||retrieved>now)return {status:'future',ageSeconds:null};
 const ageSeconds=Math.ceil((now-t)/1000)+c.uncertaintySeconds;
 return {status:ageSeconds<=FRESH_SECONDS?'fresh':'stale',ageSeconds};
}
export function searchCards(cards,{query='',platform='',version='',finish=''}={}){
 const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const q=norm(query.trim());
 return cards.filter(c=>(!q||norm(`${c.name} ${c.cardId}`).includes(q))&&(!platform||c.platform===platform)&&(!version||c.version===version)&&(!finish||c.finish===finish));
}
export function historyRisk(c){
 // Never mix hourly/daily averages with sold prices or instant BIN quotes.
 const series=c.history.filter(p=>p.kind==='hourly-average');
 if(series.length<3)return {status:'unknown',message:'Insufficient comparable hourly history; liquidity is unknown.'};
 const prices=series.map(p=>p.price),low=Math.min(...prices),high=Math.max(...prices),swingPct=(high-low)/high*100;
 return {status:swingPct>=10?'high':'observed',swingPct,message:`Hourly-average range ${swingPct.toFixed(1)}% across ${series.length} points. Historical range is not a prediction; liquidity is unknown.`};
}
export function analyzeOpportunity(c,p,now=Date.now()){
 const errors=[],f=freshness(c,now);
 if(f.status!=='fresh')errors.push(`Price freshness: ${f.status}.`);
 if(!c.source.permittedUseConfirmed)errors.push('Permitted data use has not been confirmed.');
 if(!c.bounds)errors.push('Exact card price bounds are missing.');
 if(!c.ticksVerified)errors.push('FC27 price increments are not independently verified.');
 for(const k of ['purchase','undercut','minProfit','balance','committed','allocationPct','cardExposurePct','quantity'])if(!integer(p[k]))errors.push(`${k} must be a non-negative whole number.`);
 if(!integer(p.allocationPct,0,100)||!integer(p.cardExposurePct,0,100)||!integer(p.quantity,1,50))errors.push('Allocation/exposure must be 0–100%; quantity must be 1–50.');
 if(p.committed>p.balance)errors.push('Committed coins exceed bankroll.');
 if(!isValidPriceStrict(p.purchase))errors.push('Observed purchase price needs a valid model tick.');
 if(errors.length)return {eligible:false,errors,freshness:f};
 const sell=floorTick(c.price-p.undercut),tax=Math.ceil(sell/20),netSale=sell-tax;
 const maximum=floorTick(Math.min(c.bounds.max,netSale-p.minProfit));
 if(c.price<c.bounds.min||c.price>c.bounds.max||sell<c.bounds.min||sell>c.bounds.max||p.purchase<c.bounds.min||p.purchase>c.bounds.max)errors.push('Observation, resale or purchase lies outside exact card bounds.');
 if(maximum<c.bounds.min||p.purchase>maximum)errors.push('Purchase does not meet minimum profit after conservative tax.');
 const totalBudget=Number(BigInt(p.balance)*BigInt(p.allocationPct)/100n);
 const available=Math.max(0,totalBudget-p.committed);
 const cardLimit=Number(BigInt(p.balance)*BigInt(p.cardExposurePct)/100n);
 const batchCost=BigInt(p.purchase)*BigInt(p.quantity);
 if(batchCost>BigInt(available))errors.push('Requested batch exceeds remaining allocated bankroll.');
 // All existing commitments conservatively count toward this card's exposure.
 if(batchCost+BigInt(p.committed)>BigInt(cardLimit))errors.push('Requested batch plus commitments exceeds per-card exposure limit.');
 const capacity=Math.min(50,Math.floor(available/p.purchase),Math.floor(Math.max(0,cardLimit-p.committed)/p.purchase));
 return {eligible:errors.length===0,errors,freshness:f,sell,tax,netSale,maximum,profit:netSale-p.purchase,available,cardLimit,capacity,quantity:p.quantity,totalCost:Number(batchCost),risk:historyRisk(c),label:'Private calculation for review — not an approved recommendation'};
}
export function observationFingerprint(c){return JSON.stringify([cardKey(c),c.rating,c.name,c.price,c.observedAt,c.uncertaintySeconds,c.bounds,c.ticksVerified,c.source,c.history]);}
export function approvalStatus(c,manifest,now=Date.now()){
 const receipt=manifest.find(r=>r.key===cardKey(c)&&r.observation===observationFingerprint(c)&&r.status==='approved'&&r.reviewedBy==='owner'&&validTime(r.reviewedAt)&&validTime(r.expiresAt)&&Date.parse(r.reviewedAt)<=now&&Date.parse(r.expiresAt)>now);
 return receipt&&freshness(c,now).status==='fresh'?'Owner approved for this observation':'Not owner approved';
}
