// Read-only, normal TLS certificate validation; no credential or write API.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base='https://tonyramage410-hub.github.io/fc-coin-maker-test/';
const files=['index.html','backend-client.mjs','market-ui.mjs','app.mjs','calculations.mjs','simulator.mjs','market-data.mjs','approved-cards.mjs','parse-export.mjs','styles.css'];
const results=await Promise.all(files.map(async name=>{
 const expected=await readFile(new URL('../'+name,import.meta.url),'utf8');
 const url=new URL(name,base);url.searchParams.set('m6verify',String(Date.now()));
 const r=await fetch(url,{cache:'no-store',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200);assert.equal(await r.text(),expected,`${name} differs from tested source`);
 return `PASS strict HTTPS 200 and byte-for-byte tested source: ${name}`;
}));
console.log(results.join('\n'));
await writeFile(new URL('../TEST-RESULTS-M6-INTEGRITY.txt',import.meta.url),results.join('\n')+'\n');
