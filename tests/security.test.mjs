import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('web page loads the same calculation modules as the tests',()=>{
 const html=read('index.html');assert.match(html,/<script type="module" src="\.\/app\.mjs"><\/script>/);
 assert.doesNotMatch(html,/<script[^>]*>\s*[^<\s]/);assert.doesNotMatch(html,/function (planTrade|runSimulation)/);
 assert.match(read('app.mjs'),/import \{planTrade\} from '\.\/calculations.mjs'/);
 assert.match(read('app.mjs'),/import \{runSimulation\} from '\.\/simulator.mjs'/);
});
test('strict CSP and local-only asset paths; no credential/network APIs',()=>{
 const html=read('index.html');assert.match(html,/script-src 'self'/);assert.match(html,/style-src 'self'/);assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/unsafe-inline|\son\w+=|\sstyle=/);
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(match[1].startsWith('./'));assert.ok(existsSync(new URL('../'+match[1],import.meta.url)));
 }
 for(const file of ['app.mjs','calculations.mjs','simulator.mjs'])assert.doesNotMatch(read(file),/\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(|document\.cookie|localStorage|sessionStorage|innerHTML/);
});
test('form fields have unique IDs, manual ranges and honest simulator labels',()=>{
 const html=read('index.html'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['cardMin','cardMax','auctionMinutes','marketPrice','balance','simOutput','loadStatus','sharedFields','calcFieldsAnchor'])assert.ok(ids.includes(id));
 assert.match(html,/viewport-fit=cover/);assert.match(read('styles.css'),/safe-area-inset-bottom/);assert.match(read('styles.css'),/font-size:16px/);
 assert.match(html,/assumptions, not observed win rates/);assert.match(html,/not an installable Safari extension/);
});
