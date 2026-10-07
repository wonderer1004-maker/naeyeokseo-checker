const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(page,defaults={}) {
 const elements={};
 const get=id=>elements[id]??=( {id,value:String(defaults[id]??0),textContent:'',innerHTML:'',style:{},selectedOptions:[{text:'계획관리지역 (예시)'}],addEventListener(){},classList:{add(){},remove(){},contains(c){return c==='irradiance'&&id.startsWith('irr')}}});
 const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>Object.keys(defaults).filter(x=>!['address','shadowWindow','landuse'].includes(x)).map(get)},localStorage:{removeItem(){}},window:{},console,setTimeout,clearTimeout,URL,Blob,URLSearchParams,alert(){}});
 if(page==='jibun-estimate')vm.runInContext(fs.readFileSync('docs/solar-layout.js','utf8'),context);
 const html=fs.readFileSync('docs/'+page+'.html','utf8');vm.runInContext(html.split('<script>')[1].split('</script>')[0],context);
 return {run:code=>vm.runInContext(code,context),get};
}
const inputs={area:3000,slope:8,landuse:1,usableRatio:.6,depth:.4,wall:150,reserve:10,c_civil_site:45000,c_civil_wall:350000,c_elec_main:150000,c_elec_wire:80000,c_solar_module:950000,c_solar_bos:200000};
Object.assign(inputs,{latitude:37.5,tilt:30,azimuth:180,moduleLength:2.3,moduleWidth:1.13,modulePower:550,clearance:.8,moduleGap:.02,shadowWindow:'day',performance:.8,irr0:'',irr1:'',irr2:'',irr3:''});
const p=load('jibun-estimate',inputs);p.run('calculate()');
assert.ok(p.run('lastSnapshot.총액')>0); assert.ok(Math.abs(p.run('lastLayout.capacityKw')-p.run('lastLayout.count')*.55)<1e-8);assert.equal(p.get('mEarthwork').textContent,'1,200 ㎥');
assert.equal(p.run('lastLayout.polygons.length'),p.run('lastLayout.count')+2);
assert.match(p.run('lastLayout.svg'),/북 N/); assert.ok(p.get('energySummary').textContent.includes('미입력'));
p.get('irr0').value='3';p.get('irr1').value='5';p.get('irr2').value='3';p.get('irr3').value='2';p.run('calculate()');assert.ok(p.get('energySummary').textContent.includes('연간'));
p.get('latitude').value='0';p.run('calculate()');assert.equal(p.run('lastRows'),null);p.get('latitude').value='37.5';
p.get('area').value='-1';p.run('calculate()');assert.equal(p.run('lastRows'),null);
p.get('area').value='3000';p.get('usableRatio').value='0';p.run('calculate()');assert.equal(p.run('lastRows'),null);
const q=load('index');
q.run(`processRows([{공종:'토목',품명:'<img src=x onerror=alert(1)>',단위:'㎡',수량:'1,000',합계단가:10,금액:10000},{공종:'토목',품명:'배관',단위:'m',수량:2,합계단가:10,금액:25}])`);
assert.equal(q.run('lastSummary.length'),2);assert.equal(q.run('lastRows[1].오류여부'),true);
assert.ok(!q.get('detailTable').innerHTML.includes('<img'));assert.ok(q.get('detailTable').innerHTML.includes('&lt;img'));
assert.throws(()=>q.run(`processRows([{품명:'누락',수량:1,합계단가:null,금액:0}])`));
for(const file of ['index.html','jibun-estimate.html'])assert.equal(fs.readFileSync('docs/'+file,'utf8'),fs.readFileSync('netlify-site/'+file,'utf8'));
console.log('PASS: estimate totals, invalid inputs, layout, mixed units, comma numbers, missing values, HTML escaping, deploy directory parity');

const solar=require('../docs/solar-layout.js');
const o={latitude:37.5,tilt:30,azimuth:180,length:2.3,width:1.13,power:550,clearance:.8,moduleGap:.02,window:'day'};
assert.ok(Math.abs(solar.sun(37.5,-23.44).elevation-29.06)<1e-9);
assert.ok(Math.abs(solar.sun(37.5,23.44).elevation-75.94)<1e-9);
const layout=solar.build(3000,.6,o),noon=solar.build(3000,.6,{...o,window:'noon'});
assert.ok(layout.gap>noon.gap); assert.ok(layout.count<=noon.count);
assert.ok(Math.abs(noon.shadow-2.3*Math.sin(Math.PI/6)/Math.tan(29.06*Math.PI/180))<1e-9);
assert.ok(solar.build(3000,.6,{...o,latitude:40}).gap>layout.gap);
for(const azimuth of [90,135,180,225,270]){const l=solar.build(3000,.6,{...o,azimuth});const inset=l.side*(1-Math.sqrt(.6))/2;for(const poly of l.polygons.slice(2))for(const [x,y] of poly.points)assert.ok(x>=inset-1e-8&&x<=l.side-inset+1e-8&&y>=inset-1e-8&&y<=l.side-inset+1e-8);}
assert.equal(solar.build(1,.6,o).count,0);
console.log('PASS: seasonal noon altitudes, winter shadow spacing, azimuth rotations, parcel containment, zero modules, POA energy inputs');
console.log(JSON.stringify({count:layout.count,capacity:layout.capacityKw,gap:layout.gap,pitch:layout.pitch}));
