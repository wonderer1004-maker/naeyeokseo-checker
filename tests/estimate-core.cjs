'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('../docs/estimate-core.js');
const t=E.terrain(3000,100);assert.equal(t.horizontal,3000);assert.ok(Math.abs(t.surface-4242.640687119285)<1e-9);assert.ok(Math.abs(t.angle-45)<1e-12);
assert.ok(Math.abs(E.terrain(t.surface,45,'surface','degrees').horizontal-3000)<1e-9);assert.equal(E.terrain(3000,0).surface,3000);assert.throws(()=>E.terrain(3000,90,'horizontal','degrees'));
assert.equal(E.fixed('1.005',2),1.01);assert.equal(E.product('0.1','35'),4);assert.equal(E.product('0.1','35','floor'),3);assert.equal(E.product('2.345','1000'),2345);assert.throws(()=>E.product('99999999999999999','100'));
assert.throws(()=>E.parseNumber('1,00'));assert.equal(E.parseNumber('1,000.50'),1000.5);assert.equal(E.parseNumber('(123.50)'),-123.5);assert.throws(()=>E.parseNumber(''));
const row=E.row('토목','테스트',1.23456,'㎡','1000.555','근거');assert.equal(row.수량,1.235);assert.equal(row.단가,1000.56);assert.equal(row.금액,1236);
assert.deepEqual(E.budget([E.row('토목','테스트',10,'㎡',1000,'')],10),{direct:10000,contingency:1000,vat:1100,total:12100});
const base={공종:'토목',품명:'배관',규격:'A',단위:'m',수량:'1,000',합계단가:10,금액:10000,재료비단가:4,노무비단가:5,경비단가:1};
assert.equal(E.audit([base]).rows[0].오류여부,false);
assert.ok(E.audit([base,{...base}]).rows.every(r=>r.오류여부));
const a=E.audit([base,{...base,품명:'누락',수량:'',금액:null},{...base,품명:'단가오류',경비단가:10},{품명:'합계',금액:20000}]);
assert.equal(a.rows.length,3);assert.equal(a.excluded.length,1);assert.match(a.rows[1].검토사유,/수량.*빈 값/);assert.match(a.rows[2].검토사유,/단가합계/);assert.equal(a.total,20000);
assert.equal(E.audit([{'공 종':'전기',품명:'전선',단위:'m',수량:2,단가:10,금액:20}]).rows[0].오류여부,false);
const solar=require('../docs/solar-layout.js'),o={latitude:37.5,tilt:30,azimuth:180,length:2.3,width:1.13,power:550,clearance:.8,moduleGap:.02,window:'day'};
const low=solar.build(E.terrain(3000,14.99).horizontal,.6,o),high=solar.build(E.terrain(3000,15.01).horizontal,.6,o);
assert.equal(low.count,high.count);assert.match(low.svg,/LEGEND/);assert.match(low.svg,/CONCEPT ONLY/);
for(const name of ['estimate-core.js','drawing-graphics.js','solar-layout.js','field-evidence.js','index.html','jibun-estimate.html']){
 assert.equal(fs.readFileSync('docs/'+name,'utf8'),fs.readFileSync('netlify-site/'+name,'utf8'));
 const src=fs.readFileSync('docs/'+name,'utf8');if(name.endsWith('.html'))new vm.Script(src.split('<script>')[1].split('</script>')[0]);else new vm.Script(src);
}
console.log('PASS: known slope/inverse conversion, no 15% cliff, exact decimal rounding, totals, subtotals, duplicates, aliases, missing values, syntax and deploy parity');
