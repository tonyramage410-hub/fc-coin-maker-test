import test from 'node:test';
import assert from 'node:assert/strict';
import {planTrade,permittedNextBid,floorTick,isValidPrice} from '../calculations.mjs';
test('reject malformed inputs instead of coercing them into permission',()=>{
 for(const key of ['marketPrice','undercut','minProfit','balance','allocationPct','occupiedTargets','committedCoins','cardMin','cardMax']) {
  for(const value of ['',null,true,NaN,Infinity,-1,1.5,'oops',Number.MAX_SAFE_INTEGER+1]) assert.equal(planTrade({marketPrice:1200,[key]:value}).eligible,false,`${key}: ${value}`);
 }
});
test('invalid prices, bounds and over-allocation fail closed',()=>{
 for(const p of [{marketPrice:1250},{allocationPct:101},{occupiedTargets:51},{cardMin:10000,cardMax:1000},{cardMin:1100},{committedCoins:30001}]) assert.equal(planTrade({marketPrice:1200,...p}).eligible,false);
 assert.equal(planTrade({marketPrice:150,undercut:100}).eligible,false);
 assert.equal(floorTick(149),0);
});
test('tier boundaries round down correctly',()=>{
 for(const [n,out] of [[999,950],[1000,1000],[1099,1000],[9999,9900],[10000,10000],[10249,10000],[49999,49750],[50000,50000],[50499,50000],[99999,99500],[100000,100000],[100999,100000]]) assert.equal(floorTick(n),out);
});
test('conservative fractional tax and a real arithmetic example',()=>{
 const p=planTrade({marketPrice:350,undercut:0,minProfit:0});assert.equal(p.tax,18);assert.equal(p.netSale,332);assert.equal(p.maxBid,300);
 const q=planTrade({marketPrice:11000,undercut:0,minProfit:550});assert.equal(q.tax,550);assert.equal(q.maxBid,9900);assert.equal(q.theoreticalProfit,550);
});
test('commitments consume allocated budget exactly once',()=>{
 const p=planTrade({marketPrice:1200,committedCoins:1000,occupiedTargets:48});assert.equal(p.tradingBudget,8000);assert.equal(p.reserve,21000);assert.equal(p.possibleBids,2);
 assert.equal(planTrade({marketPrice:1200,committedCoins:9000}).eligible,false);
});
test('auction expiry and mode semantics',()=>{
 for(const t of [-1,0,'',null,Infinity,16]) assert.equal(planTrade({marketPrice:1200,auctionMinutes:t}).eligible,false);
 assert.equal(planTrade({marketPrice:1200,auctionMinutes:.1}).eligible,true);
 assert.equal(planTrade({marketPrice:1200,mode:'snipe',auctionMinutes:0}).eligible,true);
});
test('permission rejects illegal ticks, coercion and expired auctions',()=>{
 for(const args of [[100,600,600,1,10],[625,700,1000,1,10],[600,600,1000,.5,10],[600,600,1000,1,0],[600,600,1000,1,-1],[600,600,1000,51,10],[600,600,1000,1,10,700,1000]]) assert.equal(permittedNextBid(...args),false);
 assert.equal(permittedNextBid(600,600,600,1,15),true);
});
test('exhaustive independent integer oracle over all model ticks through 200,000',()=>{
 // Construct legal grid independently; no calls to production tick helper.
 const grid=[];
 for(let p=150;p<=200000;p+=50) if((p<=1000)||(p>1000&&p<=10000&&p%100===0)||(p>10000&&p<=50000&&p%250===0)||(p>50000&&p<=100000&&p%500===0)||(p>100000&&p%1000===0)) grid.push(p);
 for(const market of grid) for(const undercut of [0,100,200]) {
  const sale=grid.filter(x=>x<=market-undercut).at(-1)||0;
  const proceeds=Math.floor(sale*19/20);
  const ceiling=grid.filter(x=>x<=proceeds-75).at(-1)||0;
  const p=planTrade({marketPrice:market,undercut,balance:1000000});
  assert.equal(p.sell,sale);assert.equal(p.netSale,proceeds);assert.equal(p.maxBid,ceiling);
  if(p.eligible){assert.ok(isValidPrice(p.maxBid));assert.ok(p.theoreticalProfit>=75);assert.ok(p.possibleBids*p.maxBid<=p.tradingBudget);}
 }
});

test('upper bounds and maximum safe bankroll arithmetic',()=>{
 for(const [market,maxBid] of [[1000000,949000],[15000000,14249000]]) {
  const p=planTrade({marketPrice:market,undercut:0,minProfit:75,balance:100000000});
  assert.equal(p.maxBid,maxBid);assert.ok(p.eligible);
 }
 assert.equal(planTrade({marketPrice:15001000}).eligible,false);
 const p=planTrade({marketPrice:1200,balance:Number.MAX_SAFE_INTEGER,allocationPct:99});
 assert.equal(p.tradingBudget,Number(BigInt(Number.MAX_SAFE_INTEGER)*99n/100n));
 assert.ok(p.reserve>=0);
});
