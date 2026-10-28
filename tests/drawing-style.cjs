'use strict';
const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),P=require('../docs/pv-works-core.js'),S=require('../docs/pv-works-schema.js'),G=require('../docs/pv-works-draw.js'),E=require('../docs/earthworks-core.js'),C=require('../docs/earthworks-draw.js'),A=require('../docs/engineering-sheet.js'),Solar=require('../docs/solar-layout.js'),Site=require('../docs/drawing-graphics.js'),D=require('../docs/drawing-export.js');
const m=P.build({...S.defaults(),title:'태양광 설치공사 도면 형식 검토 예제',source:'소프트웨어 검증용 가상 입력 / 실측 성과 아님'});
const e=E.build(E.parse(E.example()),{title:'가상 토공 도면 형식 검토',source:'가상 측점 / 실측 아님'});
const scenes=[...['module','electric','single','structure','detail'].map(k=>G.scene(k,m)),...['plan','long','cross'].map(k=>C.scene(k,e)),Site.paper({...m.layout,projectTitle:'가상 부지 검토'})];
for(const s of scenes){assert.equal(s.width,1260);assert.equal(s.height,891);assert.match(A.svg(s),/PROJECT \/ 공사명/);assert.match(A.svg(s),/실시설계 승인 아님/);assert.doesNotMatch(A.svg(s),/NaN|Infinity|#183153|#2563eb/);for(const p of s.items){const points=p.t==='p'?p.points:p.t==='r'?[[p.x,p.y],[p.x+p.w,p.y+p.h]]:p.t==='l'?[[p.x,p.y],[p.x2,p.y2]]:[[p.x,p.y]];for(const[x,y]of points)assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1260&&y>=0&&y<=891,JSON.stringify(p));}}
const dxf=G.dxf(m);assert.match(dxf,/SHEET_EA_001/);assert.match(dxf,/SHEET_ES_001/);assert.match(dxf,/SHEET_ST_002/);assert.match(dxf,/SECTION_POST/);assert.doesNotMatch(dxf,/NaN|Infinity/);assert.ok(Buffer.byteLength(dxf)<8e6);
const tags=dxf.trimEnd().split(String.fromCharCode(10)),handles=[];for(let i=0;i<tags.length;i+=2)if(tags[i]==='5')handles.push(tags[i+1]);assert.equal(new Set(handles).size,handles.length);assert.match(dxf,/AcDbLayerTableRecord/);assert.match(dxf,/AcDbBlockTableRecord/);assert.match(dxf,/\n2\nDASHED\n/);
const siteDxf=D.dxf(m.layout);assert.equal((siteDxf.match(/\nLWPOLYLINE\n/g)||[]).length,m.layout.polygons.length);assert.match(siteDxf,/SHEET_EA_000/);
for(const f of ['engineering-sheet.js','pv-works-draw.js','pv-works-report.js','earthworks-draw.js','earthworks-report.js','drawing-graphics.js','drawing-export.js','field-evidence.js','jibun-estimate.html','pv-works.html','earthworks.html']){assert.equal(fs.readFileSync('docs/'+f,'utf8'),fs.readFileSync('netlify-site/'+f,'utf8'));if(f.endsWith('.js'))new vm.Script(fs.readFileSync('docs/'+f,'utf8'));}
console.log('PASS: A3 borders/title blocks, monochrome vectors, finite page bounds, physical CAD geometry preservation, CAD drawing sheets and publish parity');
if(process.argv.includes('--artifacts')){
 const {createCanvas}=require('@napi-rs/canvas'),PR=require('../docs/pv-works-report.js'),ER=require('../docs/earthworks-report.js');
 fs.mkdirSync('output/pdf',{recursive:true});fs.mkdirSync('tmp/drawing-style',{recursive:true});fs.mkdirSync('output/cad',{recursive:true});
 const pages=scenes.map((s,i)=>{const c=createCanvas(2380,1684);A.canvas(c.getContext('2d'),s,{x:0,y:0,w:2380,h:1684});fs.writeFileSync('tmp/drawing-style/new-'+(i+1)+'.png',c.toBuffer('image/png'));const jpg=c.toBuffer('image/jpeg');return {width:c.width,height:c.height,jpeg:new Uint8Array(jpg)};});
 fs.writeFileSync('output/pdf/design-drawings-sample.pdf',D.pdf(pages));fs.writeFileSync('output/cad/design-drawings-sample.dxf',dxf);
 assert.equal(PR.pages(m,createCanvas).length,11);assert.equal(ER.pages(e,createCanvas).length,e.stations.length+4);
 console.log('PASS: nine-page A3 drawing sample, full drawing report integration and one cross-section per page');
}
