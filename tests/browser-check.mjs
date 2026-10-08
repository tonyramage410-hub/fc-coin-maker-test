// Optional Chromium checks; requires installed Playwright and a test browser.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(!pathname.startsWith('/fc-coin-maker-test/'))throw Error('path');
    const relative=decodeURIComponent(pathname.slice(20))||'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||!['.html','.css','.mjs'].includes(path.extname(file)))throw Error('file');
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.mjs':'text/javascript'})[path.extname(file)]);
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/fc-coin-maker-test/`;
let browser;const output=[];
try {
  browser=await chromium.launch({headless:true,...(process.env.FCM_BROWSER_EXECUTABLE?{executablePath:process.env.FCM_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
  for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]) {
    const context=await browser.newContext({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
    await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){external.push(route.request().url());await route.abort()}else await route.continue()});
    await page.goto(base);await page.locator('#loadStatus').filter({hasText:'audited M3.1'}).waitFor();
    const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await overflow();await page.locator('.nav [data-go="calc"]').click();
    assert.equal(await page.locator('#sharedFields').evaluate(el=>el.parentElement.id),'calc');
    assert.match(await page.locator('#calcOutput').innerText(),/950 coins/);
    await page.locator('#auctionMinutes').fill('0');assert.equal(await page.locator('#calcOutput .row').count(),0);
    await page.locator('.nav [data-go="sim"]').click();
    assert.equal(await page.locator('#sharedFields').evaluate(el=>el.parentElement.id),'sim');
    await page.locator('#winChance').fill('100');await page.locator('#sellChance').fill('100');await page.locator('#run').click();
    const row=label=>page.locator('#simOutput .row').filter({has:page.locator('span').filter({hasText:label})}).locator('b');
    assert.equal(await row('Completed sales').innerText(),'10 / 10');
    assert.equal(await row('Simulation realised P/L').innerText(),'950 coins');
    assert.equal(await row('Remaining cash (excludes commitments)').innerText(),'30,950 coins');await overflow();
    await page.locator('#priceDrop').fill('50');assert.match(await page.locator('#simOutput').innerText(),/Inputs changed/);
    assert.equal(await page.locator('#events').isVisible(),false);await page.locator('#run').click();
    assert.match(await row('Simulation realised P/L').innerText(),/-/);
    await page.locator('#minProfit').fill('');await page.locator('#run').click();
    assert.match(await page.locator('#simOutput').innerText(),/whole number/);
    await page.locator('#minProfit').fill('75');await page.locator('#marketPrice').fill('11000');
    await page.locator('#balance').fill('100000');await page.locator('#priceDrop').fill('13');
    await page.locator('#attempts').fill('1');await page.locator('#run').click();
    assert.match(await page.locator('#eventList').innerText(),/sale 9300, conservative tax 465/);
    for(const name of ['home','market','history']) {
      await page.locator(`.nav [data-go="${name}"]`).click();assert.equal(await page.locator('#'+name).isVisible(),true);
      assert.equal(await page.locator('#sharedFields').isVisible(),false);await overflow();
    }
    await page.reload();await page.locator('#loadStatus').filter({hasText:'audited M3.1'}).waitFor();
    await page.locator('.nav [data-go="sim"]').click();assert.equal(await page.locator('#marketPrice').inputValue(),'1200');
    assert.match(await page.locator('#simOutput').innerText(),/Run the simulator/);
    assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    if(viewport.width===390){await mkdir(path.join(root,'test-evidence'),{recursive:true});await page.screenshot({path:path.join(root,'test-evidence','chromium-390.png'),fullPage:true});}
    output.push(`PASS Chromium ${viewport.width}×${viewport.height}: modules/CSP, navigation, editable inputs, calculator, expiry, ten-sale P/L, loss, blank input, stale clearing, tier resale, reload, no overflow, no external requests/errors.`);
    await context.close();
  }
  console.log(output.join('\n'));
  await writeFile(path.join(root,'BROWSER-TEST-RESULTS.txt'),`Chromium ${browser.version()}; viewport emulation, NOT actual iPhone Safari.\n`+output.join('\n')+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
