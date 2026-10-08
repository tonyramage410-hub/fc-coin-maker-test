import {planTrade, floorTick, REVIEW_AFTER_SALES, MAX_PRICE} from './calculations.mjs';
export function runSimulation({marketPrice=1200,undercut=100,minProfit=75,balance=30000,allocationPct=30,
  occupiedTargets=0,committedCoins=0,cardMin=150,cardMax=MAX_PRICE,attempts=50,winChance=30,
  sellChance=70,priceDrop=0,seed=7,mode='snipe',auctionMinutes=15}={}) {
  const plan=planTrade({marketPrice,undercut,minProfit,balance,allocationPct,occupiedTargets,
    committedCoins,cardMin,cardMax,mode,auctionMinutes});
  const nums=[attempts,winChance,sellChance,priceDrop,seed];
  if (!nums.every(n=>typeof n==='number'&&Number.isFinite(n)) || !Number.isSafeInteger(attempts)
    || attempts<1 || attempts>1000 || winChance<0 || winChance>100 || sellChance<0 || sellChance>100
    || priceDrop<0 || priceDrop>90 || !Number.isInteger(seed) || seed<0 || seed>4294967295) {
    return {errors:['Attempts must be 1–1,000; chances 0–100%; decline 0–90%; seed a whole number 0–4,294,967,295.']};
  }
  if (!plan.eligible) return {errors:plan.errors};
  // Reserve enough integer headroom for every possible transaction in the session.
  if (Number(balance)>Number.MAX_SAFE_INTEGER-attempts*MAX_PRICE) return {errors:['Balance is too large for exact simulator accounting.']};
  let state=seed;
  function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}
  let available=plan.tradingBudget,acquired=0,sold=0,missed=0,blocked=0,spent=0,revenue=0,costSold=0,unlistable=0;
  const events=[],ledger=[],inventory=[];
  const record=(entry,message)=>{ledger.push(entry);events.push(message);};
  // Use the planner's tick model after decline, not a universal 50-coin step.
  const salePrice=floorTick(plan.sell*(100-priceDrop)/100);
  const validSale=salePrice>=Number(cardMin)&&salePrice<=Number(cardMax);
  const tax=Math.ceil(salePrice/20);
  for(let i=0;i<attempts;i++) {
    if(sold>=REVIEW_AFTER_SALES) break;
    const attempt=i+1;
    if(random()*100>=winChance) {missed++;record({attempt,type:'miss'},`Attempt ${attempt}: Hypothetical miss`);continue;}
    if(available<plan.maxBid||inventory.length>=plan.remainingTargets) {
      blocked++;record({attempt,type:'blocked'},`Attempt ${attempt}: Blocked by simulated budget or capacity`);continue;
    }
    acquired++;spent+=plan.maxBid;available-=plan.maxBid;inventory.push({attempt,cost:plan.maxBid});
    record({attempt,type:'purchase',cost:plan.maxBid},`Attempt ${attempt}: Simulated purchase at ${plan.maxBid}`);
    // One immediate sale trial for this new card. Unsold cards are retained at COST;
    // there is no asynchronous marketplace, retry, time model or mark-to-market estimate.
    if(random()*100<sellChance) {
      if(!validSale) {
        unlistable++;record({attempt,type:'unlistable',price:salePrice},`Attempt ${attempt}: Resale outside entered card range; retained unsold`);
      } else {
        const card=inventory.pop(),net=salePrice-tax;
        revenue+=net;available+=net;costSold+=card.cost;sold++;
        record({attempt,type:'sale',price:salePrice,tax,net,cost:card.cost},`Attempt ${attempt}: Simulated sale ${salePrice}, conservative tax ${tax}`);
      }
    }
  }
  const unsoldCost=inventory.reduce((sum,card)=>sum+card.cost,0);
  return {errors:[],plan,seed,attemptsExecuted:acquired+missed+blocked,acquired,sold,unsold:inventory.length,
    missed,blocked,unlistable,spent,revenue,costSold,realisedProfit:revenue-costSold,unsoldCost,
    cashAfter:Number(balance)-Number(committedCoins)-spent+revenue,availableTradingCash:available,
    simulationAssetsAtCost:Number(balance)-Number(committedCoins)-spent+revenue+unsoldCost,
    salePrice,tax,events,ledger,stoppedForReview:sold>=REVIEW_AFTER_SALES,
    warning:'Hypothetical seeded scenario only. Inputs are assumptions, not observed performance. One immediate sale trial per acquisition; unsold cards remain at cost. Proceeds are recycled inside the simulated trading pool.'};
}
