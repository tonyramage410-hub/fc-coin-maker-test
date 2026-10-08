import {planTrade} from './calculations.mjs';
import {runSimulation} from './simulator.mjs';
const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?n.toLocaleString('en-GB')+' coins':'—';
const raw=id=>$(id).value;
const numeric=id=>raw(id).trim()===''?NaN:Number(raw(id));
const shared=$('sharedFields'),simAnchor=document.createElement('div');
simAnchor.id='simFieldsAnchor';shared.before(simAnchor);
const settings=()=>Object.fromEntries(['marketPrice','undercut','minProfit','balance','allocationPct','committedCoins','occupiedTargets','cardMin','cardMax','auctionMinutes'].map(id=>[id,raw(id)]));
function go(name) {
  if(!['home','sim','calc','market','history'].includes(name))return;
  if(name==='sim')simAnchor.after(shared);
  if(name==='calc')$('calcFieldsAnchor').after(shared);
  $('auctionField').hidden=name!=='calc';
  document.querySelectorAll('.screen').forEach(screen=>{
    screen.classList.toggle('active',screen.id===name);screen.hidden=screen.id!==name;
  });
  document.querySelectorAll('.nav button').forEach(button=>{
    const active=button.dataset.go===name;button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  const heading=$(name).querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
  window.scrollTo(0,0);
}
function renderRows(target,rows) {
  target.replaceChildren();
  for(const [label,value] of rows){
    const row=document.createElement('div');row.className='row';
    const key=document.createElement('span'),val=document.createElement('b');
    key.textContent=label;val.textContent=value;row.append(key,val);target.append(row);
  }
}
function calc() {
  const p=planTrade({...settings(),mode:'bid'});
  $('calcMsg').textContent=p.eligible?'Offline model only. Verify exact card, platform, range and demand separately.':p.errors.join(' ');
  $('calcMsg').classList.toggle('error',!p.eligible);
  renderRows($('calcOutput'),p.eligible?[
    ['Model sale price',fmt(p.sell)],['Conservative tax',fmt(p.tax)],['Model purchase ceiling',fmt(p.maxBid)],
    ['Projected model profit at ceiling',fmt(p.theoreticalProfit)],['Available allocation',fmt(p.tradingBudget)],
    ['Uncommitted reserve',fmt(p.reserve)],['Possible purchases',String(p.possibleBids)]]:[]);
}
function clearSimulation() {
  $('simOutput').textContent='Inputs changed. Run a new hypothetical session to see updated results.';
  $('events').hidden=true;$('eventList').replaceChildren();
}
function run() {
  const r=runSimulation({...settings(),attempts:numeric('attempts'),winChance:numeric('winChance'),
    sellChance:numeric('sellChance'),priceDrop:numeric('priceDrop'),seed:numeric('seed')});
  const out=$('simOutput');$('events').hidden=true;$('eventList').replaceChildren();
  if(r.errors.length){out.textContent=r.errors.join(' ');return;}
  const heading=document.createElement('h3');heading.textContent='Hypothetical result — not real trades';
  const rows=document.createElement('div');renderRows(rows,[
    ['Model purchase ceiling',fmt(r.plan.maxBid)],['Scenario attempts',String(r.attemptsExecuted)],
    ['Missed',String(r.missed)],['Blocked',String(r.blocked)],['Acquired',String(r.acquired)],
    ['Completed sales',`${r.sold} / 10`],['Unsold inventory',String(r.unsold)],['Unlistable sale trials',String(r.unlistable)],
    ['Cost of unsold cards',fmt(r.unsoldCost)],['Simulation realised P/L',fmt(r.realisedProfit)],
    ['Remaining cash (excludes commitments)',fmt(r.cashAfter)],['Trading pool cash',fmt(r.availableTradingCash)],
    ['Cash + inventory at purchase cost',fmt(r.simulationAssetsAtCost)],
    ['Stop reason',r.stoppedForReview?'10-sale review policy':'Attempt limit reached']]);
  const warning=document.createElement('p');warning.className='foot';warning.textContent=r.warning;
  out.replaceChildren(heading,rows,warning);
  for(const message of r.events.slice(-40)){
    const line=document.createElement('div');line.className='event';line.textContent=message;$('eventList').append(line);
  }
  $('events').hidden=false;calc();
}
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.go)));
document.querySelectorAll('#sharedFields input,#sharedFields select,#sim input').forEach(input=>input.addEventListener('input',()=>{calc();clearSimulation();}));
$('calculate').addEventListener('click',calc);$('run').addEventListener('click',run);
calc();document.querySelector('.nav [data-go="home"]').setAttribute('aria-current','page');
$('loadStatus').textContent='Offline scenario tools ready · audited M3.1';
