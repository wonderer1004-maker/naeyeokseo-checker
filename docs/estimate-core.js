(function(root){'use strict';
function D(v){const s=String(v).trim(),m=/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);if(!m||!Number.isFinite(Number(s)))throw Error('숫자 형식 오류');const e=Number(m[4]||0);if(Math.abs(e)>100)throw Error('수치 범위 초과');let n=BigInt(m[2]+(m[3]||'')),d=10n**BigInt((m[3]||'').length);if(e>=0)n*=10n**BigInt(e);else d*=10n**BigInt(-e);return {n:m[1]==='-'?-n:n,d};}
function round(n,d,mode){const neg=n<0n,a=neg?-n:n,q=a/d,r=a%d;if(mode==='floor')return neg?-(q+(r?1n:0n)):q;return (neg?-1n:1n)*(q+(r*2n>=d?1n:0n));}
function safe(n){const v=Number(n);if(!Number.isSafeInteger(v))throw Error('안전한 계산 범위 초과');return v;}
function product(a,b,mode='round'){const x=D(a),y=D(b);return safe(round(x.n*y.n,x.d*y.d,mode));}
function fixed(v,p){const x=D(v),f=10n**BigInt(p);return safe(round(x.n*f,x.d))/Number(f);}
function parseNumber(v){if(typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER)return v;if(typeof v!=='string'||!v.trim())throw Error('빈 값');let s=v.trim();if(/^\(.*\)$/.test(s))s='-'+s.slice(1,-1);if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s))throw Error('숫자 형식 오류');const n=Number(s.replace(/,/g,''));if(!Number.isFinite(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER)throw Error('수치 범위 초과');return n;}
function terrain(area,slope,areaBasis='horizontal',slopeUnit='percent'){if(![area,slope].every(Number.isFinite)||area<=0||slope<0||!['horizontal','surface'].includes(areaBasis)||!['percent','degrees'].includes(slopeUnit))throw Error('면적·경사도 입력 오류');if(slope>(slopeUnit==='degrees'?80:567))throw Error('경사는 0~80°(약 567%) 범위로 입력하세요.');const g=slopeUnit==='percent'?slope/100:Math.tan(slope*Math.PI/180),factor=Math.hypot(1,g),horizontal=areaBasis==='surface'?area/factor:area;return {horizontal,surface:horizontal*factor,factor,angle:Math.atan(g)*180/Math.PI,percent:g*100,areaBasis,slopeUnit};}
function row(g,item,q,unit,price,basis){if(![q,Number(price)].every(Number.isFinite)||q<0||Number(price)<0)throw Error('수량·단가 범위 오류');q=fixed(q,3);price=fixed(price,2);return {공종:g,항목:item,수량:q,단위:unit,단가:price,금액:product(q,price),산출근거:basis};}
function budget(rows,reserve){if(!Number.isFinite(reserve)||reserve<0||reserve>100)throw Error('예비비 범위 오류');const direct=safe(rows.reduce((s,r)=>s+BigInt(r.금액),0n)),contingency=product(direct,reserve/100),vat=product(direct+contingency,'0.1');return {direct,contingency,vat,total:safe(BigInt(direct)+BigInt(contingency)+BigInt(vat))};}
const aliases={공종:'공종',품명:'품명',명칭:'품명',규격:'규격',단위:'단위',수량:'수량',설계수량:'수량',재료비단가:'재료비단가',노무비단가:'노무비단가',경비단가:'경비단가',합계단가:'합계단가',단가:'합계단가',금액:'금액'};
function audit(raw,mode='round'){if(!Array.isArray(raw)||raw.length>50000)throw Error('최대 50,000행까지 지원합니다.');if(!['round','floor'].includes(mode))throw Error('원단위 처리 방식 오류');const rows=[],excluded=[],seen=new Map();
for(let i=0;i<raw.length;i++){const src=raw[i];if(Object.values(src).every(v=>v===null||v===undefined||String(v).trim()===''))continue;const r={원본행:Number.isInteger(src.__rowNum__)?src.__rowNum__+1:i+2},issues=[];
for(const[k,v]of Object.entries(src)){const key=aliases[k.replace(/\s/g,'')];if(key){if(key in r&&String(r[key])!==String(v))issues.push('동일 의미 컬럼 중복: '+key);else r[key]=v;}}
const name=String(r.품명||'').trim();if(/(?:^|\s)(소계|합계|총계|총합계|부가세|부가가치세)$/.test(name)){excluded.push({원본행:r.원본행,품명:name,금액:r.금액,제외사유:'상세 내역과 중복 합산 방지'});continue;}
if(!name)issues.push('품명 누락');
for(const k of ['수량','합계단가','금액']){try{r[k]=parseNumber(r[k]);if(r[k]<0)issues.push(k+' 음수: 감액 확인');}catch(e){r[k]=null;issues.push(k+' '+e.message);}}
for(const k of ['공종','단위'])if(!String(r[k]||'').trim())issues.push(k+' 누락');
r.계산금액=null;r.차액=null;
if(r.수량!==null&&r.합계단가!==null)try{r.계산금액=product(r.수량,r.합계단가,mode);r.차액=r.금액===null?null:r.금액-r.계산금액;if(r.차액!==null&&r.차액!==0)issues.push('수량×합계단가 금액 불일치');}catch(e){issues.push(e.message);}
const keys=['재료비단가','노무비단가','경비단가'],present=keys.filter(k=>r[k]!==null&&r[k]!==undefined&&String(r[k]).trim()!=='');
if(present.length){let complete=present.length===3,sum=0n;if(!complete)issues.push('구성 단가 일부 누락: 해당 없는 비용은 0으로 입력');for(const k of present)try{r[k]=parseNumber(r[k]);sum+=BigInt(product(r[k],100));if(r[k]<0)issues.push(k+' 음수');}catch(e){complete=false;issues.push(k+' '+e.message);}if(complete){r.구성단가합계=safe(sum)/100;if(r.합계단가!==null&&fixed(r.합계단가,2)!==r.구성단가합계)issues.push('재료+노무+경비 단가합계 불일치');}}else r.검토안내='구성 단가 미제공';
if(name){const key=JSON.stringify([r.공종||'',name,r.규격||'',r.단위||'',r.수량,r.합계단가,r.금액]);if(seen.has(key)){const prev=seen.get(key);issues.push('중복 가능: '+prev.원본행+'행과 동일');prev.검토사유+=(prev.검토사유?' / ':'')+'중복 가능: '+r.원본행+'행과 동일';prev.오류여부=true;}else seen.set(key,r);}
r.검토사유=issues.join(' / ');r.오류여부=!!issues.length;rows.push(r);}
if(!rows.length)throw Error('검토할 상세 항목이 없습니다. 컬럼명을 확인하세요.');
let total=0;for(const r of rows)if(r.금액!==null){total+=r.금액;if(!Number.isFinite(total)||Math.abs(total)>Number.MAX_SAFE_INTEGER)throw Error('금액 합계 범위 초과');}
return {rows,excluded,total};}
const api={terrain,row,budget,product,fixed,parseNumber,audit};if(typeof module!=='undefined')module.exports=api;else root.EstimateCore=api;
})(typeof window==='undefined'?globalThis:window);