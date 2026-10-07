const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(page,defaults={}) {
 const elements={};
 const get=id=>elements[id]??=( {id,value:String(defaults[id]??0),textContent:'',innerHTML:'',style:{},selectedOptions:[{text:'계획관리지역 (예시)'}],addEventListener(){},classList:{add(){},remove(){}}});
 const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>Object.keys(defaults).filter(x=>x!=='address').map(get)},localStorage:{removeItem(){}},window:{},console,setTimeout,clearTimeout,URL,Blob,URLSearchParams,alert(){}});
 const html=fs.readFileSync('docs/'+page+'.html','utf8');vm.runInContext(html.split('<script>')[1].split('</script>')[0],context);
 return {run:code=>vm.runInContext(code,context),get};
}
const inputs={area:3000,slope:8,landuse:1,usableRatio:.6,depth:.4,wall:150,reserve:10,c_civil_site:45000,c_civil_wall:350000,c_elec_main:150000,c_elec_wire:80000,c_solar_module:950000,c_solar_bos:200000};
const p=load('jibun-estimate',inputs);p.run('calculate()');
assert.equal(p.run('lastSnapshot.총액'),689242620);assert.equal(p.get('mEarthwork').textContent,'1,200 ㎥');
assert.equal(p.run('lastLayout.polygons.length'),49);
assert.match(p.run('lastLayout.svg'),/CONCEPT ONLY/);
p.get('area').value='-1';p.run('calculate()');assert.equal(p.run('lastRows'),null);
p.get('area').value='3000';p.get('usableRatio').value='0';p.run('calculate()');assert.equal(p.run('lastRows'),null);
const q=load('index');
q.run(`processRows([{공종:'토목',품명:'<img src=x onerror=alert(1)>',단위:'㎡',수량:'1,000',합계단가:10,금액:10000},{공종:'토목',품명:'배관',단위:'m',수량:2,합계단가:10,금액:25}])`);
assert.equal(q.run('lastSummary.length'),2);assert.equal(q.run('lastRows[1].오류여부'),true);
assert.ok(!q.get('detailTable').innerHTML.includes('<img'));assert.ok(q.get('detailTable').innerHTML.includes('&lt;img'));
assert.throws(()=>q.run(`processRows([{품명:'누락',수량:1,합계단가:null,금액:0}])`));
for(const file of ['index.html','jibun-estimate.html'])assert.equal(fs.readFileSync('docs/'+file,'utf8'),fs.readFileSync('netlify-site/'+file,'utf8'));
console.log('PASS: estimate totals, invalid inputs, layout, mixed units, comma numbers, missing values, HTML escaping, deploy directory parity');
