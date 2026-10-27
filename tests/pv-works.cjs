'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path'),P=require('../docs/pv-works-core.js'),S=require('../docs/pv-works-schema.js'),G=require('../docs/pv-works-draw.js'),W=require('../docs/earthworks-core.js');
const base={...S.defaults(),title:'가상 설치 검토',source:'검증용 가상 기기·부재·기초, 실측/인증 아님',costSource:'가상 예시 단가',rates:Object.fromEntries(S.items.map(i=>[i[0],1000]))};
let m=P.build(base);const q=id=>m.bill.find(r=>r.id===id);
assert.equal(m.modules.length,324);assert.equal(m.strings.length,18);assert.equal(m.inverters.length,3);assert.ok(m.inverters.every(i=>i.strings.length===6));assert.equal(m.electrical.unconnected,0);assert.equal(m.issues.length,0);
assert.equal(m.racks.length,9);assert.equal(m.foundations.length,270);assert.equal(m.structure.concrete,54);assert.ok(Math.abs(m.structure.blind-9.72)<1e-9);assert.equal(q('rail').수량,126);assert.equal(q('mid').수량,630);assert.equal(q('end').수량,36);assert.equal(q('anchor').수량,1080);assert.equal(q('joint').수량,1080);
assert.ok(m.structure.railBought>=m.structure.railNet);assert.ok(Math.abs(m.electrical.coldVoc-988.2)<1e-8);
assert.equal(m.budget.direct,m.bill.reduce((s,r)=>s+r.금액,0));assert.equal(P.build({...base,moduleSpare:1}).bill.find(r=>r.id==='module').수량,328);
const union=P.union([[[0,0],[10,0],[10,10]],[[5,0],[10,0],[10,5]]]);assert.equal(union.length,20);
const dc=m.strings.reduce((v,s)=>v+(P.len(s.plus)+P.len(s.minus)+4)*1.1,0);assert.ok(Math.abs(q('dc').수량-dc)<.001);
const ac=m.inverters.reduce((v,i)=>v+(P.len(i.acPath)+4)*1.1,0);assert.ok(Math.abs(q('ac').수량-ac)<.001);
const left=P.build({...base,series:20});assert.equal(left.electrical.unconnected,144);assert.equal(left.electrical.wiredCount+left.electrical.unconnected,left.modules.length);
assert.ok(P.build({...base,tempMin:-20}).issues.some(v=>v.includes('Voc')));
assert.ok(P.build({...base,maxIsc:1}).issues.some(v=>v.includes('Isc')));
assert.equal(P.build({...base,span:2}).foundations.length,396);
assert.throws(()=>P.build({...base,span:0}));assert.throws(()=>P.build({...base,includeEarth:true}));assert.throws(()=>P.build({...base,rates:{dc:-1}}));assert.throws(()=>P.build({...base,blindOverhang:1}));
const earthProject={points:W.example(),settings:{source:'가상 토공 자료',rates:{cut:1000,fill:1000,haul:1000,borrow:1000}}};
const earth=W.build(W.parse(earthProject.points),earthProject.settings),joined=P.build({...base,includeEarth:true,earthProject,foundationEarthIncluded:true});
assert.equal(joined.budget.direct,m.budget.direct-q('excavate').금액-q('backfill').금액+earth.budget.direct);
const other=P.build({...base,includeEarth:true,earthProject:{...earthProject,settings:{...earthProject.settings,reserve:99}},foundationEarthIncluded:true});assert.equal(other.budget.total,joined.budget.total);
assert.equal(joined.bill.find(r=>r.id==='excavate').금액,0);assert.ok(joined.bill.find(r=>r.id==='excavate').수량>0);
const wb=P.workbook(m);assert.equal(wb.모듈배정.length,324);assert.equal(wb.기초수량.length,270);assert.equal(wb.스트링케이블.length,18);assert.ok(Object.keys(P.workbook(joined)).includes('토공_구간토공량'));
for(const kind of ['module','electric','single','structure','detail'])assert.doesNotMatch(G.svg(G.scene(kind,m)),/NaN|Infinity/);
for(const n of ['schema','core','draw','report','app']){const file='pv-works-'+n+'.js';assert.equal(fs.readFileSync('docs/'+file,'utf8'),fs.readFileSync('netlify-site/'+file,'utf8'));new vm.Script(fs.readFileSync('docs/'+file,'utf8'));}
assert.equal(fs.readFileSync('docs/pv-works.html','utf8'),fs.readFileSync('netlify-site/pv-works.html','utf8'));
console.log('PASS: module/string accounting, balanced inverters, cable cores/polarities, route union, clamps/steel/foundations/bolts, temperature/Isc checks and single-tax earthwork integration');
async function artifacts(){
 const {createCanvas}=require('@napi-rs/canvas'),R=require('../docs/pv-works-report.js'),D=require('../docs/drawing-export.js'),XLSX=require('../.tools/xlsx.cjs');
 const byId={},all=[],downloads=[];
 function el(tag='div',id=''){const x={tagName:tag.toUpperCase(),children:[],handlers:{},checked:false,disabled:false,hidden:false,append(...c){this.children.push(...c);},replaceChildren(...c){this.children=c;},addEventListener(k,f){this.handlers[k]=f;},setAttribute(k,v){this[k]=v;},click(){}};let value='',eid='';Object.defineProperty(x,'value',{get:()=>value,set:v=>value=String(v)});Object.defineProperty(x,'id',{get:()=>eid,set:v=>{eid=String(v);if(eid)byId[eid]=x;}});x.id=id;all.push(x);return x;}
 const get=id=>byId[id]||el('div',id),html=fs.readFileSync('docs/pv-works.html','utf8');for(const a of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g))el(a[1],a[2]);
 const document={getElementById:get,createElement:tag=>tag==='canvas'?createCanvas(1,1):el(tag),querySelectorAll:selector=>all.filter(x=>selector.split(',').map(v=>v.trim().toUpperCase()).includes(x.tagName))};
 class U extends URL{}U.createObjectURL=b=>{downloads.push(b);return 'blob:test';};U.revokeObjectURL=()=>{};
 let captured;const c=vm.createContext({document,console,location:{hostname:'example.github.io'},URL:U,Blob,TextDecoder,Uint8Array,setTimeout,clearTimeout,EstimateCore:require('../docs/estimate-core.js'),PvSchema:S,PvWorks:P,PvDraw:G,PvReport:R,DrawingExport:D,Earthworks:W,XLSX:{...XLSX,writeFile:b=>captured=b}});
 vm.runInContext(fs.readFileSync('docs/pv-works-app.js','utf8'),c);
 get('example').onclick();get('calculate').onclick();assert.equal(get('result').hidden,false);assert.match(get('power').textContent,/178.2/);assert.match(get('structure').innerHTML,/<svg/);
 get('xlsx').onclick();assert.equal(captured.SheetNames.length,11);get('save').onclick();const project=JSON.parse(await downloads[0].text());assert.equal(project.format,'pv-install-works');assert.ok(!('vworldKey' in project.settings));
 const sample=P.build(project.settings);fs.mkdirSync('output/pdf',{recursive:true});fs.mkdirSync('output/spreadsheets',{recursive:true});fs.mkdirSync('output/cad',{recursive:true});
 const pages=R.pages(sample,createCanvas);assert.equal(pages.length,11);fs.writeFileSync('output/pdf/pv-works-sample.pdf',D.pdf(pages));
 fs.writeFileSync('output/spreadsheets/pv-works-sample.xlsx',XLSX.write(captured,{type:'buffer',bookType:'xlsx'}));const reopen=XLSX.read(fs.readFileSync('output/spreadsheets/pv-works-sample.xlsx'),{type:'buffer'});assert.equal(XLSX.utils.sheet_to_json(reopen.Sheets['모듈배정']).length,324);assert.equal(XLSX.utils.sheet_to_json(reopen.Sheets['기초수량']).length,270);
 get('area').handlers.input();assert.equal(get('result').hidden,true);const before=downloads.length;get('dxf').onclick();assert.equal(downloads.length,before);
 await get('import').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify(project)}],value:'test'}});get('calculate').onclick();assert.equal(get('result').hidden,false);
 await get('import').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify({format:'solar-field-project',version:2,inputs:{area:'4242.640687119285',slope:'45',slopeUnit:'degrees',areaBasis:'surface'}})}],value:'test'}});get('calculate').onclick();assert.ok(Math.abs(Number(get('area').value)-3000)<1e-8);
 await get('import').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify({format:'earthworks-sections',version:1,...earthProject})}],value:'test'}});assert.equal(get('includeEarth').checked,false);get('includeEarth').checked=true;get('foundationEarthIncluded').checked=true;get('calculate').onclick();assert.equal(get('result').hidden,false);assert.equal(get('error').textContent,'');
 const dxf=G.dxf(sample);assert.match(dxf,/SECTION_POST/);assert.match(dxf,/SLD_AC_BRANCH/);assert.doesNotMatch(dxf,/NaN|Infinity/);fs.writeFileSync('output/cad/pv-works-sample.dxf',dxf);
 const cp=require('node:child_process'),convert=path.resolve('.tools/libredwg/dxf2dwg.exe'),reader=path.resolve('.tools/libredwg/dwgread.exe'),target=path.resolve('output/cad/pv-works-sample.dwg');
 if(fs.existsSync(convert)){if(fs.existsSync(target))fs.unlinkSync(target);cp.execFileSync(convert,['--as','r2000','-o',target,path.resolve('output/cad/pv-works-sample.dxf')],{windowsHide:true,stdio:'pipe'});assert.equal(fs.readFileSync(target).subarray(0,6).toString(),'AC1015');const json=JSON.parse(cp.execFileSync(reader,['-O','JSON',target],{windowsHide:true,maxBuffer:8e6}).toString());assert.equal(json.OBJECTS.filter(o=>o.entity==='LWPOLYLINE').length,(dxf.match(/\nLWPOLYLINE\n/g)||[]).length);}
 console.log('PASS: 11-page PDF, eleven-sheet workbook readback, native complete DWG, workflow export/project restore, legacy area conversion, optional soil import and stale results');
}
const closedScene=G.scene('module',m).items.find(p=>p.t==='p'&&p.stroke==='#183153');assert.deepEqual(closedScene.points[0],closedScene.points.at(-1));
const deepScene=G.scene('detail',P.build({...base,footD:3,frontHeight:.1}));assert.ok(deepScene.items.filter(p=>p.t==='r'&&['#e2e8f0','#fef3c7'].includes(p.fill)).every(p=>p.y+p.h<580));
assert.match(G.svg(G.scene('single',P.build({...base,series:50}))),/인버터 없음/);

if(process.argv.includes('--artifacts'))artifacts().catch(e=>{console.error(e);process.exitCode=1;});
