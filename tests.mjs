import assert from 'node:assert/strict';
import {runSimulation} from './simulator.mjs';
for(const seed of [0,1,5,100,4294967295]){
 const x=runSimulation({seed,attempts:100,winChance:100,sellChance:100});
 assert.equal(x.errors.length,0);assert.equal(x.sold,10);assert.equal(x.unsold,0);assert.equal(x.acquired,10);assert.equal(x.realisedProfit,10*x.plan.theoreticalProfit);
 assert.deepEqual(x,runSimulation({seed,attempts:100,winChance:100,sellChance:100}));
}
const no=runSimulation({attempts:30,winChance:0});assert.equal(no.acquired,0);assert.equal(no.missed,30);assert.equal(no.realisedProfit,0);
const unsold=runSimulation({attempts:50,winChance:100,sellChance:0});assert.equal(unsold.realisedProfit,0);assert.equal(unsold.unsoldCost,unsold.spent);assert.ok(unsold.acquired<=9);
const drop=runSimulation({attempts:30,winChance:100,sellChance:100,priceDrop:50});assert.ok(drop.realisedProfit<0);
assert.ok(runSimulation({attempts:0}).errors.length);assert.ok(runSimulation({winChance:200}).errors.length);
assert.ok(runSimulation({marketPrice:100}).errors.length);
console.log('SIMULATOR TESTS PASSED: deterministic seed, ten-sale cutoff, no-wins, unsold accounting, bankroll ceiling, loss scenario, input validation');
