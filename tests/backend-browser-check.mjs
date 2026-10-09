// Chromium mobile emulation, not physical iPhone Safari. No credentials.
// Default: local assets at Pages origin + deterministic M5 contract responses.
// --staging: local assets + real HTTPS backend. --live: deployed Pages + backend.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {FIXTURES} from './demo-fixtures.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const base='https://tonyramage410-hub.github.io/fc-coin-maker-test/';
const backend='https://fc-coin-maker-m5-test.tonyramage410.workers.dev';
const live=process.argv.includes('--live'),network=live||process.argv.includes('--staging');
const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
const browser=await chromium.launch({executablePath:process.env.FCM_BROWSER_EXECUTABLE,args:['--no-sandbox'],proxy});
const results=[];
try{
 for(const viewport of network?[{width:390,height:844},{width:1280,height:900}]:[{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900,ignoreHTTPSErrors:true});
  const page=await context.newPage(),errors=[],calls=[];let failure='',delayResolve;
  page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.origin===new URL(base).origin){
    if(live)return route.continue();
    const relative=u.pathname.slice('/fc-coin-maker-test/'.length)||'index.html',file=path.resolve(root,relative);
    if(!file.startsWith(root)||!['.html','.mjs','.css'].includes(path.extname(file)))return route.abort();
    return route.fulfill({body:await readFile(file),contentType:{'.html':'text/html','.css':'text/css','.mjs':'text/javascript'}[path.extname(file)]});
   }
   assert.equal(u.origin,backend,'Unexpected remote request');calls.push({url:u.href,method:request.method(),headers:request.headers()});
   if(network)return route.continue();
   if(failure==='offline')return route.abort('internetdisconnected');
   if((failure==='delayed'&&u.pathname.endsWith('/quote'))||(failure==='delayed-status'&&u.pathname==='/v1/status'))await new Promise(resolve=>delayResolve=resolve);
   const headers={'Access-Control-Allow-Origin':new URL(base).origin,'Cache-Control':'no-store','Content-Type':'application/json'};
   if(failure==='503'||(failure==='history'&&u.pathname.endsWith('/history')))return route.fulfill({status:503,headers,body:'{"error":{"code":"unavailable"}}'});
   if(failure==='malformed')return route.fulfill({headers,body:'{broken'});
   const q=u.searchParams,found=FIXTURES.filter(c=>(!q.get('q')||(c.name+' '+c.cardId).toLowerCase().includes(q.get('q').toLowerCase()))&&['platform','version','finish'].every(k=>!q.get(k)||c[k]===q.get(k)));
   const envelope={schemaVersion:1,mode:'synthetic',synthetic:true,realMarketConnected:false,approved:false};
   const projected=c=>({...c,history:[],synthetic:true,ownerApproval:'not-approved'});
   let j;
   if(u.pathname==='/v1/status')j={release:'m5-synthetic-only',mode:'synthetic-only',providerCreditBudget:0,providerRequestsEnabled:false,realMarketConnected:false,eaConnected:false,tradingAutomationEnabled:false,approvalWritesEnabled:false};
   else if(u.pathname.endsWith('/quote'))j={...envelope,card:projected(found[0])};
   else if(u.pathname.endsWith('/history'))j={...envelope,identity:found[0],history:found[0].history};
   else j={...envelope,count:found.length,cards:found.map(projected)};
   if(failure==='mismatch'&&j.identity)j.identity={...j.identity,platform:'pc'};
   return route.fulfill({headers,body:JSON.stringify(j)});
  });
  await page.goto(base);await page.locator('#marketReady').filter({hasText:'Milestone 6 ready'}).waitFor({state:'attached'});
  await page.locator('.nav [data-go="market"]').click();
  const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Page overflow');
  await page.locator('#loadDemo').click();await page.locator('#demoStatus').filter({hasText:'Connected · 4'}).waitFor();assert.equal(await page.locator('#playerResults button').count(),4);await overflow();
  await page.locator('#playerResults button').filter({hasText:'PlayStation'}).filter({hasText:'TEST TOTW'}).click();
  await page.locator('#cardDetail').filter({hasText:'Fictional demonstration price'}).waitFor();
  assert.match(await page.locator('#cardDetail').innerText(),/1,200 coins/);assert.equal(await page.locator('#cardDetail tbody tr').count(),3);assert.equal(await page.locator('#prepareReview').isDisabled(),true);await overflow();
  await page.locator('#opPurchase').fill('950');await page.locator('#analyzeMarket').click();assert.match(await page.locator('#opportunityOutput').innerText(),/cannot qualify as real opportunities/);
  for(const [platform,expected]of [['pc','1,300 coins'],['xbox','Unavailable']]){
   await page.locator('#marketPlatform').selectOption(platform);await page.locator('#searchDemo').click();await page.locator('#demoStatus').filter({hasText:'Connected · 1'}).waitFor();await page.locator('#playerResults button').click();await page.locator('#cardDetail').filter({hasText:'Fictional demonstration price'}).waitFor();assert.match(await page.locator('#cardDetail').innerText(),new RegExp(expected));await overflow();
   if(platform==='xbox')assert.equal(await page.locator('#cardDetail tbody tr').count(),0);
  }
  await page.locator('#marketPlatform').selectOption('ps');await page.locator('#marketVersion').selectOption('TEST GOLD');await page.locator('#marketFinish').selectOption('holographic');await page.locator('#searchDemo').click();await page.locator('#demoStatus').filter({hasText:'Connected · 1'}).waitFor();await page.locator('#playerResults button').click();await page.locator('#cardDetail').filter({hasText:'Fictional demonstration price'}).waitFor();assert.match(await page.locator('#cardDetail').innerText(),/1,000 coins/);
  await page.locator('#playerQuery').fill('no such player');await page.locator('#searchDemo').click();await page.locator('#demoStatus').filter({hasText:'Connected · 0'}).waitFor();assert.equal(await page.locator('#playerResults button').count(),0);assert.equal(await page.locator('#opportunityPanel').isVisible(),false);
  await page.locator('#playerQuery').fill('<script>');await page.locator('#searchDemo').click();await page.locator('#demoStatus').filter({hasText:'Invalid demo search'}).waitFor();assert.equal(await page.locator('#playerResults button').count(),0);
  if(!network){
   for(const f of ['503','offline','malformed']){failure=f;await page.locator('#loadDemo').click();await page.locator('#demoStatus').filter({hasText:/returned HTTP|failed or timed out/}).waitFor();assert.equal(await page.locator('#playerResults button').count(),0);assert.equal(await page.locator('#opportunityPanel').isVisible(),false);}
   failure='';await page.locator('#loadDemo').click();await page.locator('#demoStatus').filter({hasText:'Connected · 4'}).waitFor();
   for(const f of ['history','mismatch']){failure=f;await page.locator('#playerResults button').first().click();await page.locator('#cardDetail').filter({hasText:/HTTP 503|identity mismatch/}).waitFor();assert.equal(await page.locator('#opportunityPanel').isVisible(),false);}
   failure='delayed';await page.locator('#playerResults button').first().click();await page.locator('#cardDetail').filter({hasText:'Loading exact'}).waitFor();while(!delayResolve)await new Promise(r=>setTimeout(r,10));await page.locator('#clearMarket').click();delayResolve();await page.waitForTimeout(100);assert.equal(await page.locator('#cardDetail').isVisible(),false);assert.equal(await page.locator('#playerResults button').count(),0);failure='';
   failure='delayed-status';delayResolve=undefined;await page.locator('#loadDemo').click();while(!delayResolve)await new Promise(r=>setTimeout(r,10));const countBeforeClear=calls.length;await page.locator('#clearMarket').click();delayResolve();await page.waitForTimeout(100);assert.equal(calls.length,countBeforeClear,'Cancelled status must not initiate a search');assert.equal(await page.locator('#playerResults button').count(),0);failure='';
   await page.locator('details').evaluate(e=>e.open=true);await page.locator('#marketJSON').fill(JSON.stringify({schemaVersion:1,cards:[FIXTURES[0]]}));await page.locator('#loadMarket').click();assert.match(await page.locator('#searchStatus').innerText(),/imported/);assert.equal(await page.locator('#searchDemo').isDisabled(),true);await page.locator('#playerResults button').click();assert.equal(await page.locator('#prepareReview').isDisabled(),true);assert.match(await page.locator('#cardDetail').innerText(),/DEMONSTRATION ONLY/);await overflow();
   const imported={...FIXTURES[0],provider:'manual-export-test',name:'User-supplied record',history:[]};await page.locator('#marketJSON').fill(JSON.stringify({schemaVersion:1,cards:[imported]}));await page.locator('#loadMarket').click();await page.locator('#playerResults button').click();assert.equal(await page.locator('#prepareReview').isDisabled(),false);await page.locator('#reviewScore').fill('5');await page.locator('#reviewNotes').fill('Private review request');await page.locator('#prepareReview').click();assert.match(await page.locator('#reviewDraft').inputValue(),/pending-owner-decision/);assert.match(await page.locator('#cardDetail').innerText(),/Not owner approved/);
  }
  for(const c of calls){assert.equal(c.method,'GET');assert.equal(c.headers.authorization,undefined);assert.equal(c.headers.cookie,undefined);assert.equal(c.headers.referer,undefined);assert.ok(new URL(c.url).pathname==='/v1/status'||new URL(c.url).pathname.startsWith('/v1/demo/cards'));}
  assert.deepEqual(errors,[]);
  if(viewport.width===390){await mkdir(path.join(root,'test-evidence'),{recursive:true});await page.screenshot({path:path.join(root,'test-evidence',`m6-${live?'live':network?'staging':'contract'}-390.png`),fullPage:true});}
  results.push(`PASS ${viewport.width}×${viewport.height}: ${network?'real HTTPS backend and browser CORS':'contract responses, failures, imports and stale-request races'}; exact platform/version/finish, quotes, history, null price, no matches, invalid query, approval lock, opportunity block, no overflow, no credential/write requests, no page errors.`);
  await context.close();
 }
 console.log(results.join('\n'));
 await writeFile(path.join(root,`TEST-RESULTS-M6-${live?'LIVE':network?'STAGING':'BROWSER'}.txt`),`Chromium ${browser.version()}; viewport emulation, NOT physical iPhone Safari.\n${results.join('\n')}\n`);
}finally{await browser.close();}
