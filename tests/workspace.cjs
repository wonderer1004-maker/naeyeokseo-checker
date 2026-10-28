'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const keys=['site','earth','module','electric','structure','review'],ids=new Map(),historyCalls=[],listeners={};
class El{constructor(){this.children=[];this.dataset={};this.events={};this.attrs={};this.hidden=false;this.contentWindow={WorkspaceSheet:{setMode:m=>{this.mode=m;}}};}append(c){c.parentElement=this;this.children.push(c);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.events[k]=f;}focus(){this.focused=true;}showModal(){this.open=true;}close(){this.open=false;}}
const get=id=>{if(!ids.has(id))ids.set(id,new El());return ids.get(id);},tabs=keys.map(k=>{const x=get('tab-'+k);x.dataset.sheet=k;return x;});
const location={hash:'#module'},window={addEventListener:(k,f)=>listeners[k]=f};
const document={querySelectorAll:()=>tabs,querySelector:()=>get('skip'),getElementById:get,createElement:()=>new El()};
const history={pushState:(_,__,hash)=>{historyCalls.push(hash);location.hash=hash;}};
vm.runInNewContext(fs.readFileSync('docs/workspace.js','utf8'),{document,window,location,history});
const api=window.Workspace,host=get('frameHost');assert.equal(api.current,'module');assert.equal(api.frameCount,1);const frame=host.children[0].children[0];assert.equal(frame.src,'pv-works.html?embedded=1');
frame.events.load();assert.equal(frame.mode,'module');frame.contentWindow.testInput='keep me';
api.select('electric');assert.equal(api.frameCount,1);assert.equal(frame.mode,'electric');assert.equal(frame.contentWindow.testInput,'keep me');assert.equal(frame.parentElement.id,'panel-electric');assert.equal(frame.title,'전기공사 작업 화면');
api.select('structure');assert.equal(api.frameCount,1);assert.equal(frame.mode,'structure');
api.select('site');assert.equal(frame.hidden,true);api.select('earth');api.select('review');assert.equal(api.frameCount,4);api.select('module');assert.equal(frame.hidden,false);assert.equal(frame.contentWindow.testInput,'keep me');
const count=historyCalls.length;api.select('__proto__');assert.equal(historyCalls.length,count);assert.equal(api.current,'module');
location.hash='#electric';listeners.popstate();assert.equal(api.current,'electric');assert.equal(historyCalls.length,count);
let prevented=false;tabs[3].events.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});assert.equal(api.current,'structure');assert.equal(prevented,true);assert.equal(tabs[4].focused,true);
get('help').events.click();assert.equal(get('helpDialog').open,true);get('closeHelp').events.click();assert.equal(get('helpDialog').open,false);
get('skip').events.click({preventDefault(){}});assert.equal(get('workarea').focused,true);assert.equal(api.current,'structure');
function entry(file,search='',embedded=false){let replaced;const self={},top=embedded?{}:self;vm.runInNewContext(fs.readFileSync('docs/workspace-entry.js','utf8'),{window:{top,self},location:{protocol:'https:',pathname:'/app/'+file,search,href:'https://example.org/app/'+file+search,replace:u=>replaced=u},URL,URLSearchParams});return replaced;}
for(const[file,key]of [['index.html','review'],['earthworks.html','earth'],['pv-works.html','module'],['jibun-estimate.html','site']])assert.equal(entry(file),'https://example.org/app/workspace.html#'+key);
assert.equal(entry('pv-works.html','',true),undefined);assert.equal(entry('pv-works.html','?standalone=1'),undefined);
for(const f of ['workspace.html','workspace.js','workspace.css','workspace-entry.js','sheet-ui.js','sheet-ui.css','index.html','jibun-estimate.html','earthworks.html','pv-works.html']){assert.equal(fs.readFileSync('docs/'+f,'utf8'),fs.readFileSync('netlify-site/'+f,'utf8'));if(f.endsWith('.js'))new vm.Script(fs.readFileSync('docs/'+f,'utf8'));}
console.log('PASS: six sheet routes, four retained documents, shared PV state, history, keyboard, help, skip-link, legacy redirects, script syntax and publish parity');
