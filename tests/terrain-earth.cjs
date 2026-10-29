'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../docs/terrain-earth-core.js'),D=require('../docs/terrain-earth-draw.js'),E=require('../docs/earthworks-core.js');
const rad=Math.PI/180,R=6378137,lon=127,lat=36,LL=([x,y])=>[lon+x/(R*rad*Math.cos(lat*rad)),lat+y/(R*rad)],rectangle=[[-10,-10],[10,-10],[10,10],[-10,10]].map(LL);
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`);
function calc(coords,fn,plan={elevation:100,slopeX:0,slopeY:0},spacing=5){const g=C.grid(coords,spacing);return C.calculate(g,g.points.map(fn),plan);}
let m=calc(rectangle,()=>102);close(m.area,400,1e-5);close(m.cut,800,1e-5);close(m.fill,0);
m=calc(rectangle,()=>98);close(m.fill,800,1e-5);close(m.cut,0);
m=calc(rectangle,p=>100+p.x);close(m.cut,1000,1e-5);close(m.fill,1000,1e-5);
m=calc(rectangle,p=>100+p.x,{elevation:100,slopeX:100/2,slopeY:0});close(m.cut,500,1e-5);close(m.fill,500,1e-5);
// Concave L: 300m²; no integration over its excluded corner.
const concave=[[-10,-10],[10,-10],[10,0],[0,0],[0,10],[-10,10]].map(LL);
m=calc(concave,()=>102);close(m.area,300,1e-4);close(m.cut,600,1e-3);
const reverse=calc([...concave].reverse(),()=>102);close(reverse.cut,m.cut,.001);
const diagonal=[[-13,-9],[12,-4],[0,15]].map(LL);m=calc(diagonal,()=>101);close(m.cut,m.area,1e-6);close(m.cells.reduce((s,c)=>s+c.절토량,0),m.cut);
const coarse=calc(diagonal,p=>100+.2*p.x-.1*p.y),fine=calc(diagonal,p=>100+.2*p.x-.1*p.y,undefined,2);close(coarse.cut,fine.cut,.001);close(coarse.fill,fine.fill,.001);
for(const coords of [[],rectangle.slice(0,2),[rectangle[0],rectangle[2],rectangle[1],rectangle[3]],[...rectangle,rectangle[0],rectangle[1]]])assert.throws(()=>C.grid(coords));
assert.throws(()=>C.grid(rectangle,0));assert.throws(()=>C.grid([[-100,-100],[100,-100],[100,100],[-100,100]].map(LL),2),/超過|초과/);
const g=C.grid(rectangle,5);assert.throws(()=>C.calculate(g,[],{elevation:100,slopeX:0,slopeY:0}),/누락/);assert.throws(()=>C.calculate(g,g.points.map(()=>null),{elevation:100,slopeX:0,slopeY:0}));assert.throws(()=>C.calculate(g,g.points.map(()=>Infinity),{elevation:100,slopeX:0,slopeY:0}));assert.throws(()=>C.calculate(g,g.points.map(()=>100),{elevation:100,slopeX:51,slopeY:0}));
// A transect outside the polygon is empty; profile segments remain on the plane.
m=calc(concave,p=>100+.1*p.x);assert.equal(C.transect(m,'x',100).length,0);for(const seg of C.transect(m,'y',0))for(const p of seg)close(p[2],100+.1*p[0]);
const estimate=E.fromVolumes(400,200,{compacted:.8,loose:1.2,reuse:50,rates:{cut:10,fill:20,haul:5,borrow:30}});assert.equal(estimate.balance.재사용자연량,200);assert.equal(estimate.balance.부족토자연량,50);assert.equal(estimate.balance.반출느슨한량,240);assert.equal(estimate.budget.direct,10700);assert.throws(()=>E.fromVolumes(-1,2));
m={...m,estimate:E.fromVolumes(m.cut,m.fill),title:'가상 수학 검증용 지형',source:'합성 검증 자료 · 실제 브이월드 조회 아님',datum:'가상 기준',sampledAt:'2026-10-29T00:00:00Z'};
const scenes=D.scenes(m);assert.ok(scenes.length>=8);for(const s of scenes){assert.equal(s.width,1260);assert.equal(s.height,891);for(const p of s.items)for(const k of ['x','y','x2','y2','w','h'])if(k in p)assert.ok(Number.isFinite(p[k]));}
const dxf=D.dxf(m);assert.match(dxf,/TERRAIN_3D/);assert.match(dxf,/DESIGN_3D/);assert.match(dxf,/SHEET_TE_001/);assert.doesNotMatch(dxf,/NaN|Infinity/);
for(const file of ['earthworks-core.js','earthworks.html','terrain-earth-core.js','terrain-earth-draw.js','terrain-earth-app.js','terrain-earth.css','terrain-3d-runtime.js']){assert.equal(fs.readFileSync('docs/'+file,'utf8'),fs.readFileSync('netlify-site/'+file,'utf8'));if(file.endsWith('.js'))new vm.Script(fs.readFileSync('docs/'+file,'utf8'));}
console.log('PASS: constant/sloping terrain analytic volumes, signed zero crossing, concave boundary clipping, grid convergence, missing-height rejection, soil balance, real profile segments, CAD scene syntax and mirror parity');
if(process.argv.includes('--exports')){const {createCanvas}=require('@napi-rs/canvas'),S=require('../docs/engineering-sheet.js'),P=require('../docs/drawing-export.js');const pages=scenes.map(s=>{const c=createCanvas(1260,891);S.canvas(c.getContext('2d'),s,{x:0,y:0,w:1260,h:891});return {width:1260,height:891,jpeg:new Uint8Array(c.toBuffer('image/jpeg'))};});const pdf=Buffer.from(P.pdf(pages));assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,scenes.length);fs.mkdirSync('tmp/terrain-earth',{recursive:true});fs.writeFileSync('tmp/terrain-earth/test-native.dxf',dxf);console.log('PASS: '+pages.length+' A3 PDF pages generated and verified in memory; native CAD test input ready');}
if(process.argv.includes('--render')){const {createCanvas}=require('@napi-rs/canvas'),S=require('../docs/engineering-sheet.js');fs.mkdirSync('tmp/terrain-earth',{recursive:true});for(const[i,s]of scenes.entries()){const c=createCanvas(1260,891);S.canvas(c.getContext('2d'),s,{x:0,y:0,w:1260,h:891});fs.writeFileSync('tmp/terrain-earth/page-'+(i+1)+'.png',c.toBuffer('image/png'));}console.log('Rendered '+scenes.length+' A3 scenes for visual QA.');}
