import test from 'node:test';
import assert from 'node:assert/strict';
import {floorTick,planTrade,permittedNextBid} from '../calculations.mjs';
test('illustrative 1200 coin market calculates conservative trade',()=>{const p=planTrade({marketPrice:1200,undercut:100,minProfit:75,balance:30000,allocationPct:30});assert.equal(p.sell,1100);assert.equal(p.tax,55);assert.equal(p.maxBid,950);assert.equal(p.theoreticalProfit,95);assert.equal(p.possibleBids,9);});
test('bid cannot exceed locked maximum, balance, slots or 15 minute window',()=>{assert.equal(permittedNextBid(600,600,600,1,15),true);for(const args of [[650,600,1000,1,10],[600,600,500,1,10],[600,600,1000,0,10],[600,600,1000,1,16]]) assert.equal(permittedNextBid(...args),false);});
test('50 target capacity blocks proposed batch',()=>{const p=planTrade({marketPrice:1200,balance:200000,occupiedTargets:50});assert.equal(p.possibleBids,0);assert.equal(p.eligible,false);});
test('no market quote means no actionable ceiling',()=>{const p=planTrade({marketPrice:0});assert.equal(p.eligible,false);assert.equal(p.maxBid,0);});
test('rounds down instead of up',()=>{assert.equal(floorTick(845),800);assert.equal(floorTick(1099),1000);});
test('low coin balance never creates bids',()=>{const p=planTrade({marketPrice:1200,balance:100,allocationPct:10});assert.equal(p.possibleBids,0);});
