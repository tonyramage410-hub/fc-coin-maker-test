import {parseDataset,searchCards,freshness,historyRisk,analyzeOpportunity,approvalStatus,observationFingerprint} from './market-data.mjs';
import {OWNER_APPROVALS} from './approved-cards.mjs';
const $=id=>document.getElementById(id);
const labels={ps:'PlayStation',xbox:'Xbox',pc:'PC',switch:'Switch'};
const fmt=n=>n===null?'Unavailable':n.toLocaleString('en-GB')+' coins';
const when=t=>t?new Date(t).toLocaleString('en-GB',{timeZone:'Europe/London',timeZoneName:'short'}):'Unknown';
let cards=[],selected=null,importGeneration=0;
function element(tag,value,cls){const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;}
function sourceLink(url,label){const a=element('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function row(target,label,value){const r=element('div',undefined,'row');r.append(element('span',label),element('b',value));target.append(r);}
function clearDraft(){ $('reviewDraft').value='';$('reviewStatus').textContent='No approval decision recorded.';}
function clearSelection(){selected=null;$('cardDetail').hidden=true;$('opportunityPanel').hidden=true;$('opportunityOutput').replaceChildren();$('opPurchase').value='';clearDraft();}
function showDetail(){
 const box=$('cardDetail');box.replaceChildren();if(!selected)return;
 box.hidden=false;$('opportunityPanel').hidden=false;
 box.append(element('h3',`${selected.name} · ${selected.rating}`),element('p',`${selected.game} · ${selected.version} · ${selected.finish} · ${labels[selected.platform]}`, 'identity'),element('p',`Provider ${selected.provider} · card ID ${selected.cardId}`, 'identity'));
 row(box,'Imported reference price',fmt(selected.price));const f=freshness(selected);
 row(box,'Freshness (5-minute policy)',`${f.status}${f.ageSeconds===null?'':` · upper age ${f.ageSeconds}s`}`);
 row(box,'Source observation',when(selected.observedAt));row(box,'Provider retrieval',when(selected.source.retrievedAt));
 row(box,'Timing uncertainty',`${selected.uncertaintySeconds}s`);row(box,'Card range',selected.bounds?`${fmt(selected.bounds.min)} – ${fmt(selected.bounds.max)}`:'Unavailable');
 box.append(element('p',`Imported source: ${selected.source.name} · ${selected.source.endpoint}. Provenance is a source declaration, not an independently authenticated feed.`, 'foot'),sourceLink(selected.source.url,'Open observation source'));
 row(box,'Owner approval',approvalStatus(selected,OWNER_APPROVALS));
 box.append(element('p',historyRisk(selected).message,'risk'));
 const title=element('h3','Supplied price history');box.append(title);
 if(!selected.history.length)box.append(element('p','No reliable price history supplied. No chart or trend is invented.','muted'));
 else{
  box.append(element('p','Historical averages, observed BIN and completed-sale records are labelled separately. No interpolation or sales-volume estimate.','foot'));
  const wrap=element('div',undefined,'history-wrap'),table=element('table',undefined,'history-table'),head=element('thead'),hr=element('tr');
  for(const label of ['Observed (UK)','Price','Kind / source'])hr.append(element('th',label));head.append(hr);table.append(head);
  const body=element('tbody');for(const p of selected.history.slice(-30)){const tr=element('tr'),date=element('td'),t=element('time',when(p.observedAt));t.dateTime=p.observedAt;date.append(t);const kind=element('td',`${p.kind} `);kind.append(sourceLink(p.sourceURL,'Source'));tr.append(date,element('td',fmt(p.price)),kind);body.append(tr);}table.append(body);wrap.append(table);box.append(wrap);
  box.append(element('p',`Showing latest ${Math.min(30,selected.history.length)} of ${selected.history.length} supplied observations.`, 'foot'));
 }
}
function renderSearch(){
 const matches=searchCards(cards,{query:$('playerQuery').value,platform:$('marketPlatform').value,version:$('marketVersion').value,finish:$('marketFinish').value});
 const box=$('playerResults');box.replaceChildren();$('searchStatus').textContent=cards.length?`${matches.length} exact card/platform matches in ${cards.length} imported records. This is not a complete live catalogue.`:'No observations loaded. Import a permitted FC 27 catalogue first.';
 for(const c of matches){const b=element('button',`${c.name} · ${c.rating} · ${c.version} · ${c.finish}\n${labels[c.platform]} · ID ${c.cardId} · ${fmt(c.price)} · ${freshness(c).status}`,'outline card-choice');b.type='button';b.addEventListener('click',()=>{clearSelection();selected=c;showDetail();$('cardDetail').scrollIntoView({block:'start'});});box.append(b);}
 if(selected&&!matches.some(c=>c.key===selected.key))clearSelection();
}
function applyImport(raw){
 try{const data=parseDataset(raw);cards=data.cards;clearSelection();const select=$('marketVersion');select.replaceChildren();const all=element('option','All supplied versions');all.value='';select.append(all);for(const v of [...new Set(cards.map(c=>c.version))].sort()){const o=element('option',v);o.value=v;select.append(o);}
 $('marketPulse').textContent=cards.length?`${cards.length} imported records`:'No feed connected';$('importStatus').textContent=`Loaded ${cards.length} observations into this tab. Live integration remains disconnected. No data uploaded.`;renderSearch();
 }catch{$('importStatus').textContent='Import rejected. Check the schema, exact FC27 identities, dates, price increments, sources and size. Remove all credential fields. Previous valid data has been retained.';}
}
$('loadMarket').addEventListener('click',()=>{importGeneration++;applyImport($('marketJSON').value);$('marketJSON').value='';});
$('marketImport').addEventListener('change',async()=>{
 const generation=++importGeneration;const file=$('marketImport').files?.[0];if(!file)return;
 if(file.size>1000000){$('importStatus').textContent='Import rejected: maximum file size is 1 MB.';$('marketImport').value='';return;}
 try{const raw=await file.text();if(generation===importGeneration)applyImport(raw);}catch{$('importStatus').textContent='Could not read the selected file.';}finally{$('marketImport').value='';}
});
$('clearMarket').addEventListener('click',()=>{importGeneration++;cards=[];clearSelection();$('marketJSON').value='';$('marketImport').value='';$('reviewNotes').value='';$('reviewScore').value='';$('marketPulse').textContent='No feed connected';$('importStatus').textContent='Imported data and draft cleared. No observations loaded.';renderSearch();});
for(const id of ['playerQuery','marketPlatform','marketVersion','marketFinish'])$(id).addEventListener('input',renderSearch);
const parameters=()=>Object.fromEntries(Object.entries({purchase:'opPurchase',undercut:'opUndercut',minProfit:'opProfit',balance:'opBalance',committed:'opCommitted',allocationPct:'opAllocation',cardExposurePct:'opExposure',quantity:'opQuantity'}).map(([k,id])=>[k,$(id).value.trim()===''?NaN:Number($(id).value)]));
function analyze(){
 const box=$('opportunityOutput');box.replaceChildren();if(!selected){box.textContent='Select an exact card first.';return;}
 showDetail();const r=analyzeOpportunity(selected,parameters());box.append(element('p',r.eligible?'Meets entered arithmetic and exposure limits. Still unapproved; resale is not guaranteed.':r.errors.join(' '),r.eligible?'notice':'error'));
 if(r.sell!==undefined){for(const [label,value]of [['Conservative resale',fmt(r.sell)],['Conservative 5% tax',fmt(r.tax)],['Net proceeds',fmt(r.netSale)],['Maximum purchase ceiling',fmt(r.maximum)],['Net profit per card',fmt(r.profit)],['Remaining allocation',fmt(r.available)],['Maximum units within exposure',String(r.capacity)]])row(box,label,value);}
}
$('analyzeMarket').addEventListener('click',analyze);
for(const id of ['opPurchase','opUndercut','opProfit','opBalance','opCommitted','opAllocation','opExposure','opQuantity'])$(id).addEventListener('input',()=>{$('opportunityOutput').textContent='Inputs changed. Recheck the observation.';clearDraft();});
for(const id of ['reviewScore','reviewNotes'])$(id).addEventListener('input',clearDraft);
$('prepareReview').addEventListener('click',()=>{
 if(!selected){$('reviewStatus').textContent='Select an exact card first.';return;}
 const raw=$('reviewScore').value,score=Number(raw);if(!raw.trim()||!Number.isInteger(score)||score<0||score>10||!$('reviewNotes').value.trim()){$('reviewStatus').textContent='Enter a whole score from 0 to 10 and review notes.';return;}
 const request={type:'owner-review-request',status:'pending-owner-decision',cardKey:selected.key,observation:observationFingerprint(selected),requestedAt:new Date().toISOString(),score,notes:$('reviewNotes').value,parameters:parameters(),analysis:analyzeOpportunity(selected,parameters())};
 $('reviewDraft').value=JSON.stringify(request,null,2);$('reviewStatus').textContent='Draft prepared privately. Copy and send to Luke. Nothing has been approved, sent or published.';
});
// Freshness is recalculated from observation time, never reset when imported or viewed.
setInterval(()=>{renderSearch();if(selected){showDetail();if($('opportunityOutput').textContent&&!$('opportunityOutput').textContent.startsWith('Inputs changed'))analyze();}},30000);
renderSearch();

$('marketReady').textContent='Milestone 4 import tools ready · live feed disconnected';
