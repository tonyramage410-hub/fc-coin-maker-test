import test from 'node:test';
import assert from 'node:assert/strict';
import {runSimulation} from '../simulator.mjs';
import {isValidPrice} from '../calculations.mjs';
test('seed repeatability and exact ten-sale cutoff',()=>{
 for(const seed of [0,1,7,100,4294967295]){
  const r=runSimulation({seed,attempts:100,winChance:100,sellChance:100});
  assert.deepEqual(r,runSimulation({seed,attempts:100,winChance:100,sellChance:100}));
  assert.equal(r.sold,10);assert.equal(r.acquired,10);assert.equal(r.unsold,0);assert.equal(r.attemptsExecuted,10);
  assert.equal(r.realisedProfit,950);assert.equal(r.cashAfter,30950);assert.equal(r.stoppedForReview,true);
 }
});
test('no wins executes attempts without consuming coins',()=>{
 const r=runSimulation({winChance:0,attempts:30});assert.equal(r.acquired,0);assert.equal(r.missed,30);
 assert.equal(r.spent,0);assert.equal(r.cashAfter,30000);assert.equal(r.realisedProfit,0);
});
test('no sales retains cost basis and obeys budget and slots',()=>{
 const r=runSimulation({winChance:100,sellChance:0});assert.equal(r.unsold,9);assert.equal(r.unsoldCost,8550);
 assert.equal(r.realisedProfit,0);assert.equal(r.cashAfter,21450);assert.equal(r.simulationAssetsAtCost,30000);
 const q=runSimulation({winChance:100,sellChance:0,occupiedTargets:49});assert.equal(q.acquired,1);assert.equal(q.unsold,1);
});
test('declining sale uses legal tiers and can realise a loss',()=>{
 for(const marketPrice of [1200,11000,51000,105000]){
  const r=runSimulation({marketPrice,priceDrop:13,winChance:100,sellChance:100,balance:1000000});
  assert.equal(r.errors.length,0);assert.ok(isValidPrice(r.salePrice));assert.ok(r.realisedProfit<0);
  for(const e of r.ledger.filter(x=>x.type==='sale'))assert.ok(isValidPrice(e.price));
 }
 const r=runSimulation({marketPrice:11000,balance:100000,priceDrop:13,attempts:1,winChance:100,sellChance:100});
 assert.equal(r.plan.sell,10750);assert.equal(r.salePrice,9300);assert.equal(r.tax,465);
});
test('sale below card minimum is not a completed sale',()=>{
 const r=runSimulation({marketPrice:1200,cardMin:900,priceDrop:50,winChance:100,sellChance:100});
 assert.equal(r.sold,0);assert.equal(r.unlistable,r.acquired);assert.equal(r.unsold,r.acquired);assert.equal(r.revenue,0);
 const q=runSimulation({marketPrice:350,priceDrop:90,winChance:100,sellChance:100});assert.equal(q.salePrice,0);assert.equal(q.sold,0);
});
test('committed bankroll is excluded once; zero/invalid capacity rejects',()=>{
 const r=runSimulation({committedCoins:1000,winChance:100,sellChance:0});assert.equal(r.plan.tradingBudget,8000);
 assert.equal(r.acquired,8);assert.equal(r.cashAfter,21400);assert.equal(r.simulationAssetsAtCost,29000);
 for(const p of [{committedCoins:9000},{occupiedTargets:50},{balance:100},{cardMin:1000},{cardMax:1000}])assert.ok(runSimulation(p).errors.length);
});
test('simulator controls reject invalid input and seed aliasing',()=>{
 for(const key of ['attempts','winChance','sellChance','priceDrop','seed'])for(const value of ['',null,true,NaN,Infinity,'3'])assert.ok(runSimulation({[key]:value}).errors.length,`${key}: ${value}`);
 for(const p of [{attempts:0},{attempts:1001},{attempts:1.5},{seed:-1},{seed:4294967296},{seed:1.5},{winChance:101},{sellChance:-1},{priceDrop:91},{balance:Number.MAX_SAFE_INTEGER}])assert.ok(runSimulation(p).errors.length);
 assert.equal(runSimulation({winChance:30.5,sellChance:99.9}).errors.length,0);
});
test('numeric strings from planner controls preserve exact accounting',()=>{
 const r=runSimulation({balance:'30000',committedCoins:'1000',marketPrice:'1200',cardMin:'150',cardMax:'15000000'});
 assert.equal(r.errors.length,0);assert.ok(Number.isSafeInteger(r.cashAfter));
});
test('independent accounting oracle for 600 seeded sessions',()=>{
 for(let seed=0;seed<600;seed++){
  const r=runSimulation({seed,attempts:100,winChance:seed%101,sellChance:(seed*7)%101,priceDrop:seed%91,occupiedTargets:seed%50,committedCoins:seed%3000});
  assert.equal(r.errors.length,0);
  const purchases=r.ledger.filter(x=>x.type==='purchase'),sales=r.ledger.filter(x=>x.type==='sale');
  const spent=purchases.reduce((s,e)=>s+e.cost,0),revenue=sales.reduce((s,e)=>s+e.net,0),costSold=sales.reduce((s,e)=>s+e.cost,0);
  assert.equal(r.spent,spent);assert.equal(r.revenue,revenue);assert.equal(r.costSold,costSold);
  assert.equal(r.realisedProfit,revenue-costSold);assert.equal(r.unsoldCost,spent-costSold);
  assert.equal(r.acquired,r.sold+r.unsold);assert.equal(r.attemptsExecuted,r.acquired+r.blocked+r.missed);
  assert.equal(r.cashAfter,30000-seed%3000-spent+revenue);
  assert.equal(r.simulationAssetsAtCost,30000-seed%3000+r.realisedProfit);
  let available=r.plan.tradingBudget,slots=0;
  for(const e of r.ledger){
   if(e.type==='purchase'){assert.ok(available>=e.cost);available-=e.cost;slots++;assert.ok(slots<=r.plan.remainingTargets);}
   if(e.type==='sale'){assert.ok(isValidPrice(e.price));assert.equal(e.tax,Math.ceil(e.price/20));assert.equal(e.net,e.price-e.tax);available+=e.net;slots--;}
  }
  assert.equal(available,r.availableTradingCash);assert.ok(available>=0);assert.ok(r.sold<=10);
 }
});
