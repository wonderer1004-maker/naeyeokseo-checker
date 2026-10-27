'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),E=require('../docs/earthworks-core.js'),G=require('../docs/earthworks-draw.js');
function rectangle(existing,design){return [0,20].flatMap(station=>[-5,0,5].map(offset=>({station,offset,existing,design})));}
let m=E.build(rectangle(102,100));assert.equal(m.cut,400);assert.equal(m.fill,0);
m=E.build(rectangle(100,102));assert.equal(m.fill,400);assert.equal(m.cut,0);
const mixed=[0,20].flatMap(station=>[-5,0,5].map((offset,i)=>({station,offset,existing:[100,102,100][i],design:101})));
m=E.build(mixed);assert.equal(m.cut,50);assert.equal(m.fill,50);assert.equal(m.stations[0].pieces.length,4);
m=E.build(rectangle(100,102),{compacted:.8,loose:1.2});assert.equal(m.balance.성토필요자연량,500);assert.equal(m.balance.부족토자연량,500);
m=E.build(rectangle(102,100),{reuse:50,loose:1.2});assert.equal(m.balance.반출느슨한량,480);
assert.throws(()=>E.build([...rectangle(102,100),rectangle(102,100)[0]]),/중복/);
assert.throws(()=>E.build(rectangle(102,100).filter((p,i)=>i!==4)),/중심|좌/);
assert.throws(()=>E.build(rectangle(102,100),{compacted:0}));
const ragged=rectangle(102,100);ragged[3]={...ragged[3],offset:-6};assert.throws(()=>E.build(ragged),/같아야/);
assert.throws(()=>E.parse('station,offset,existing,design\n0,-5,,100'));
assert.throws(()=>E.parse('station,offset,existing,design\n0,"1"2,100,100'));
const tab='\uFEFF측점\t이격거리\t현황고\t계획고\n0\t-5\t102\t100\n0\t0\t102\t100\n0\t5\t102\t100\n20\t-5\t102\t100\n20\t0\t102\t100\n20\t5\t102\t100';assert.equal(E.build(E.parse(tab)).cut,400);
const settings={title:'가상 예제 (실측 아님)',source:'소프트웨어 검증용 가상 측점, 측량 성과 아님',costSource:'가상 예시 단가, 시세 아님',loose:1,compacted:1,reuse:100,reserve:10,rates:{cut:8000,fill:9000,haul:5000,borrow:12000}};
m=E.build(E.parse(E.example()),settings);assert.equal(m.stations.length,4);assert.equal(m.cut,167.892);assert.equal(m.fill,82.892);
assert.equal(m.budget.direct,m.costs.reduce((v,r)=>v+r.금액,0));const data=E.workbook(m);assert.equal(Object.keys(data).length,8);assert.equal(data.구간토공량.reduce((v,r)=>v+r.절토량,0),m.cut);
for(const kind of ['plan','long','cross']){const svg=G.svg(G.scene(kind,m));assert.match(svg,/<svg/);assert.doesNotMatch(svg,/NaN|Infinity/);}
const dxf=G.dxf(m);assert.match(dxf,/CROSS_EXIST/);assert.match(dxf,/LONG_DESIGN/);assert.doesNotMatch(dxf,/NaN|Infinity/);
for(const n of ['earthworks-core.js','earthworks-draw.js','earthworks-report.js','earthworks-app.js','earthworks.html'])assert.equal(fs.readFileSync('docs/'+n,'utf8'),fs.readFileSync('netlify-site/'+n,'utf8'));
for(const n of ['earthworks-core.js','earthworks-draw.js','earthworks-report.js','earthworks-app.js'])new vm.Script(fs.readFileSync('docs/'+n,'utf8'));
console.log('PASS: known rectangle/mixed-sign earthwork volumes, zero-crossing areas, soil balance, CSV validation, workbook quantities, CAD profiles and deploy parity');
async function artifacts(){
 const {createCanvas}=require('@napi-rs/canvas'),R=require('../docs/earthworks-report.js'),D=require('../docs/drawing-export.js');
 fs.mkdirSync('output/pdf',{recursive:true});fs.mkdirSync('output/cad',{recursive:true});fs.mkdirSync('output/spreadsheets',{recursive:true});
 const pages=R.pages(m,createCanvas);assert.equal(pages.length,6);fs.writeFileSync('output/pdf/earthworks-sample.pdf',D.pdf(pages));fs.writeFileSync('output/cad/earthworks-sample.dxf',dxf);
 const XLSX=require('../.tools/xlsx.cjs'),wb=XLSX.utils.book_new();
 for(const[name,rows]of Object.entries(data))XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),name);
 fs.writeFileSync('output/spreadsheets/earthworks-sample.xlsx',XLSX.write(wb,{bookType:'xlsx',type:'buffer'}));const reopened=XLSX.read(fs.readFileSync('output/spreadsheets/earthworks-sample.xlsx'),{type:'buffer'});assert.equal(reopened.SheetNames.length,8);assert.equal(XLSX.utils.sheet_to_json(reopened.Sheets['구간토공량']).reduce((v,r)=>v+r.절토량,0),m.cut);
 const elements={},downloads=[],get=id=>elements[id]??={id,value:'',hidden:false,disabled:false,textContent:'',innerHTML:'',children:[],handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},click(){}};
 const html=fs.readFileSync('docs/earthworks.html','utf8');for(const tag of html.matchAll(/<input\b[^>]*>/g)){const id=tag[0].match(/id="([^"]+)"/)?.[1];if(id)get(id).value=tag[0].match(/value="([^"]*)"/)?.[1]||'';}
 const doc={getElementById:get,querySelectorAll(){return Object.values(elements);},createElement(t){return t==='canvas'?createCanvas(1,1):get('generated'+Object.keys(elements).length);}};
 class U extends URL{}U.createObjectURL=b=>{downloads.push(b);return 'blob:test';};U.revokeObjectURL=()=>{};
 const c=vm.createContext({document:doc,console,location:{hostname:'example.github.io'},URL:U,Blob,TextDecoder,Uint8Array,setTimeout,clearTimeout});c.Earthworks=E;c.EarthDraw=G;c.EarthReport=R;c.DrawingExport=D;c.XLSX={...XLSX,writeFile(book,name){assert.equal(book.SheetNames.length,8);}};
 vm.runInContext(fs.readFileSync('docs/earthworks-app.js','utf8'),c);
 get('example').onclick();get('calculate').onclick();assert.equal(get('result').hidden,false);assert.match(get('cut').textContent,/167.892/);assert.match(get('plan').innerHTML,/svg/);
 get('xlsx').onclick();get('save').onclick();const project=JSON.parse(await downloads[0].text());assert.equal(project.format,'earthworks-sections');
 get('points').handlers.input();assert.equal(get('result').hidden,true);const count=downloads.length;get('dxf').onclick();assert.equal(downloads.length,count);
 const cp=require('node:child_process'),convert=path.resolve('.tools/libredwg/dxf2dwg.exe'),read=path.resolve('.tools/libredwg/dwgread.exe'),target=path.resolve('output/cad/earthworks-sample.dwg');
 if(fs.existsSync(convert)){if(fs.existsSync(target))fs.unlinkSync(target);cp.execFileSync(convert,['--as','r2000','-o',target,path.resolve('output/cad/earthworks-sample.dxf')],{windowsHide:true,stdio:'pipe'});assert.equal(fs.readFileSync(target).subarray(0,6).toString(),'AC1015');const json=JSON.parse(cp.execFileSync(read,['-O','JSON',target],{windowsHide:true,maxBuffer:4e6}).toString());const entities=json.OBJECTS.filter(o=>o.entity==='LWPOLYLINE');assert.equal(entities.length,(dxf.match(/\nLWPOLYLINE\n/g)||[]).length);console.log('PASS: native full drawing DWG write/read geometry count');}
 console.log('PASS: 6-page A3 PDF, eight-sheet XLSX write/read, application calculation/export/project and stale-result prevention');
}
if(process.argv.includes('--artifacts'))artifacts().catch(e=>{console.error(e);process.exitCode=1;});
