import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {planTrade} from '../calculations.mjs';
import {runSimulation} from '../simulator.mjs';
function fixture(){
 class Element {
  constructor(id=''){this.id=id;this.value='';this.textContent='';this.hidden=false;this.children=[];this.events={};this.attrs={};this.parent=null;this.classes=new Set();this.classList={toggle:(key,yes)=>yes?this.classes.add(key):this.classes.delete(key)};}
  append(...nodes){for(const n of nodes){n.parent?.children.splice(n.parent.children.indexOf(n),1);n.parent=this;this.children.push(n);}}
  before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
  after(node){node.parent?.children.splice(node.parent.children.indexOf(node),1);node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,node);}
  replaceChildren(...nodes){this.children=[];this.textContent='';this.append(...nodes);}
  addEventListener(key,fn){this.events[key]=fn;}setAttribute(key,val){this.attrs[key]=val;}removeAttribute(key){delete this.attrs[key];}
  querySelector(){return new Element();}focus(){}
 }
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),nodes={};
 for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes[match[1]]=new Element(match[1]);
 for(const match of html.matchAll(/<(?:input|select)\b[^>]*id="([^"]+)"[^>]*>/g)){
  const id=match[1],val=match[0].match(/value="([^"]*)"/);nodes[id].value=val?val[1]:'100';
 }
 nodes.sim.append(nodes.sharedFields);nodes.calc.append(nodes.calcFieldsAnchor);nodes.events.hidden=true;
 const screens=['home','sim','calc','market','history'].map(id=>nodes[id]);
 const buttons=screens.map(screen=>{const b=new Element();b.dataset={go:screen.id};return b;});
 const inputs=['marketPrice','undercut','minProfit','balance','allocationPct','committedCoins','occupiedTargets','cardMin','cardMax','auctionMinutes','seed','attempts','winChance','sellChance','priceDrop'].map(id=>nodes[id]);
 const document={getElementById:id=>nodes[id],createElement:()=>new Element(),querySelector:()=>buttons[0],querySelectorAll:s=>s==='.screen'?screens:s==='.nav button'||s==='[data-go]'?buttons:inputs};
 vm.runInNewContext(readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),{document,window:{scrollTo(){}},planTrade,runSimulation});
 const text=node=>node.textContent+node.children.map(text).join(' ');
 return {nodes,go:name=>buttons.find(b=>b.dataset.go===name).events.click(),click:id=>nodes[id].events.click(),change(id,value){nodes[id].value=value;nodes[id].events.input()},text:id=>text(nodes[id])};
}
test('calculator is initially correct; form is directly editable in both tools',()=>{
 const f=fixture();assert.match(f.text('calcOutput'),/950 coins/);f.go('calc');assert.equal(f.nodes.sharedFields.parent,f.nodes.calc);assert.equal(f.nodes.auctionField.hidden,false);
 f.go('sim');assert.equal(f.nodes.sharedFields.parent,f.nodes.sim);assert.equal(f.nodes.auctionField.hidden,true);
});
test('blank inputs cannot be silently converted to zero',()=>{
 for(const id of ['minProfit','balance','committedCoins','occupiedTargets','seed','attempts','winChance','sellChance','priceDrop']){
  const f=fixture();f.change(id,'');f.click('run');assert.doesNotMatch(f.text('simOutput'),/Hypothetical result/);assert.equal(f.nodes.events.hidden,true);
 }
});
test('input edit clears previous simulation and events',()=>{
 const f=fixture();f.click('run');assert.match(f.text('simOutput'),/Hypothetical result/);assert.equal(f.nodes.events.hidden,false);
 f.change('priceDrop','50');assert.match(f.text('simOutput'),/Inputs changed/);assert.equal(f.nodes.events.hidden,true);assert.equal(f.nodes.eventList.children.length,0);
});
test('auction time is validated rather than hardcoded and navigation hides inactive screens',()=>{
 const f=fixture();f.go('calc');f.change('auctionMinutes','0');f.click('calculate');assert.equal(f.nodes.calcOutput.children.length,0);assert.match(f.text('calcMsg'),/above 0/);
 f.go('sim');f.click('run');assert.match(f.text('simOutput'),/Hypothetical result/);
 assert.equal(f.nodes.calc.hidden,true);assert.equal(f.nodes.sim.hidden,false);
});
