(function(root){'use strict';
const E=typeof EstimateCore!=='undefined'?EstimateCore:require('./estimate-core.js');
function parse(text){
 text=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');if(text.length>2e6)throw Error('CSV는 2MB 이하입니다.');
 const delimiter=text.split('\n')[0].includes('\t')?'\t':',',rows=[];let row=[],cell='',quote=false,closed=false;
 for(let i=0;i<=text.length;i++){const c=text[i]||'\n';if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else if(quote){quote=false;closed=true;}else if(!cell&&!closed)quote=true;else throw Error('CSV 따옴표 오류');}else if(!quote&&(c===delimiter||c==='\n')){row.push(cell.trim());cell='';closed=false;if(c==='\n'){if(row.some(v=>v!==''))rows.push(row);row=[];}}else {if(closed&&c.trim())throw Error('따옴표 뒤 불필요한 문자');cell+=c;}}
 if(quote)throw Error('CSV 따옴표가 닫히지 않았습니다.');if(rows.length<3)throw Error('헤더와 2개 이상 단면을 입력하세요.');
 const aliases={station:'station',측점:'station',누가거리:'station',offset:'offset',이격거리:'offset',횡단거리:'offset',existing:'existing',현황고:'existing',지반고:'existing',design:'design',계획고:'design'},header=rows.shift().map(v=>aliases[v.replace(/\s/g,'').toLowerCase()]);
 for(const k of ['station','offset','existing','design'])if(header.filter(v=>v===k).length!==1)throw Error(k+' 헤더를 하나씩 입력하세요.');
 if(rows.length>8080)throw Error('8,080점 이하로 입력하세요.');
 return rows.map((r,i)=>{if(r.length!==header.length)throw Error((i+2)+'행 컬럼 수 오류');const p={};header.forEach((k,j)=>{if(k)p[k]=E.parseNumber(r[j]);});return p;});
}
function strips(points){
 const list=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d0=a.existing-a.design,d1=b.existing-b.design,ts=[0,1];if(d0*d1<0)ts.splice(1,0,d0/(d0-d1));
 const at=t=>({offset:a.offset+(b.offset-a.offset)*t,existing:a.existing+(b.existing-a.existing)*t,design:a.design+(b.design-a.design)*t});
 for(let j=1;j<ts.length;j++){const p=at(ts[j-1]),q=at(ts[j]),depth=((p.existing-p.design)+(q.existing-q.design))/2,area=(q.offset-p.offset)*Math.abs(depth);list.push({p,q,cut:depth>0?area:0,fill:depth<0?area:0});}}
 return list;
}
function build(points,settings={}){
 if(!Array.isArray(points)||points.length>8080)throw Error('측점 수 범위 초과');const groups=new Map();
 for(const raw of points){const p={};for(const k of ['station','offset','existing','design']){if(typeof raw[k]!=='number'||!Number.isFinite(raw[k])||Math.abs(raw[k])>1e7)throw Error('측점 수치 오류');p[k]=raw[k];}if(p.station<0)throw Error('누가거리는 0 이상이어야 합니다.');if(!groups.has(p.station))groups.set(p.station,[]);groups.get(p.station).push(p);}
 const stations=[...groups].sort((a,b)=>a[0]-b[0]).map(([station,points])=>{points.sort((a,b)=>a.offset-b.offset);if(points.length<3||points.length>101||!points.some(p=>p.offset===0)||points[0].offset>=0||points.at(-1).offset<=0)throw Error('각 측점은 좌·중심(0)·우 3~101점이 필요합니다.');if(points.some((p,i)=>i&&p.offset===points[i-1].offset))throw Error('측점·이격거리 중복');const pieces=strips(points);return {station,points,pieces,cut:pieces.reduce((s,p)=>s+p.cut,0),fill:pieces.reduce((s,p)=>s+p.fill,0)};});
 if(stations.length<2||stations.length>80)throw Error('2~80개 단면이 필요합니다.');const offsets=stations[0].points.map(p=>p.offset);
 for(const s of stations)if(s.points.length!==offsets.length||s.points.some((p,i)=>p.offset!==offsets[i]))throw Error('모든 단면의 이격거리 목록·횡단 폭이 같아야 합니다. 누락 자료는 추정하지 않습니다.');
 const intervals=[];for(let i=1;i<stations.length;i++){const a=stations[i-1],b=stations[i],length=b.station-a.station;intervals.push({시작측점:a.station,끝측점:b.station,거리:length,시작절토면적:a.cut,끝절토면적:b.cut,시작성토면적:a.fill,끝성토면적:b.fill,절토량:E.fixed((a.cut+b.cut)*length/2,3),성토량:E.fixed((a.fill+b.fill)*length/2,3),산식:'거리 × (시작면적+끝면적)/2'});}
 const cut=E.fixed(intervals.reduce((v,p)=>v+p.절토량,0),3),fill=E.fixed(intervals.reduce((v,p)=>v+p.성토량,0),3),L=Number(settings.loose??1),C=Number(settings.compacted??1),reuse=Number(settings.reuse??100);
 if(![L,C,reuse].every(Number.isFinite)||L<.1||L>5||C<.1||C>5||reuse<0||reuse>100)throw Error('L·C=0.1~5, 재사용률=0~100% 범위로 입력하세요.');
 const need=fill/C,used=Math.min(cut*reuse/100,need),spoil=Math.max(0,cut-used),borrow=Math.max(0,need-used);
 const balance={절토자연량:cut,성토다짐량:fill,성토필요자연량:E.fixed(need,3),재사용자연량:E.fixed(used,3),반출자연량:E.fixed(spoil,3),반출느슨한량:E.fixed(spoil*L,3),부족토자연량:E.fixed(borrow,3),L,C,재사용가능률:reuse};
 const specs=[['절토(자연상태)',cut,'cut','구간 절토량 합계'],['성토·다짐(다짐상태)',fill,'fill','구간 성토량 합계'],['잔토 반출(느슨한상태)',balance.반출느슨한량,'haul','(절토 자연량-재사용 자연량) × L'],['부족토 조달(자연상태)',balance.부족토자연량,'borrow','max(성토 다짐량/C-재사용 자연량,0)']];
 const costs=specs.map(([label,q,key,basis])=>E.row('토공',label,q,'㎥',Number(settings.rates?.[key]??0),basis)),budget=E.budget(costs,Number(settings.reserve??10));
 const warnings=['직선 기준선의 지역 좌표: x=누가거리, y=좌측 이격거리. 실제 필지·곡선 선형·지리 좌표가 아닙니다.','평균단면법 근사: 측점 사이 급격한 지형 변화는 추가 측점이 필요합니다.','입력 폭 밖 사면 접속·배수·옹벽·표토·암 분류·반입 운반비·처리 수수료는 제외됩니다.'];
 if(costs.some(r=>r.수량>0&&r.단가===0))warnings.push('단가 0인 물량 항목이 있어 금액은 미완성 견적입니다.');
 if(L===1&&C===1)warnings.push('L=C=1.0은 토질 검증 전의 1:1 가정입니다.');
 return {stations,offsets,intervals,cut,fill,balance,costs,budget,warnings,source:String(settings.source||'자료 출처 미입력').slice(0,200),title:String(settings.title||'종횡단·토공 검토').slice(0,100),surveyDate:String(settings.surveyDate||'미입력').slice(0,20),costSource:String(settings.costSource||'단가 출처 미입력').slice(0,200),settings};
}
function example(){const rows=['station,offset,existing,design'];for(const station of [0,20,40,60])for(const offset of [-10,-5,0,5,10])rows.push([station,offset,(100+station*.012+offset*.04+Math.cos(station/20)*.25).toFixed(3),(100.15+station*.005).toFixed(3)].join(','));return rows.join('\n');}
function workbook(m){
 const data={입력측점:m.stations.flatMap(s=>s.points.map(p=>({측점:p.station,이격거리:p.offset,현황고:p.existing,계획고:p.design,고저차:p.existing-p.design}))),단면분할산출:m.stations.flatMap(s=>s.pieces.map(p=>({측점:s.station,시작이격:p.p.offset,끝이격:p.q.offset,시작현황고:p.p.existing,끝현황고:p.q.existing,시작계획고:p.p.design,끝계획고:p.q.design,절토면적:p.cut,성토면적:p.fill,산식:'폭 × 양끝 고저차 평균, 영교차 분할'}))),단면적집계:m.stations.map(s=>({측점:s.station,절토면적:s.cut,성토면적:s.fill})),구간토공량:m.intervals,토량환산:Object.entries(m.balance).map(([항목,값])=>({항목,값})),내역서:m.costs.map(r=>({...r,품명:r.항목,합계단가:r.단가})),공사비총괄:[{직접공사비:m.budget.direct,예비비:m.budget.contingency,부가세:m.budget.vat,총액:m.budget.total}]};
 data.산출조건=Object.entries({프로젝트:m.title,자료출처:m.source,측량기준일:m.surveyDate,단가출처:m.costSource,수량기준:'평균단면법. 단면적은 내부 정밀도로 계산, 구간 체적 소수 3자리 반올림 후 합산.',단위:'길이 m, 면적 ㎡, 체적 ㎥. 동일 표고 기준의 현황고·계획고 필요.',파일성격:'앱에서 산출한 결과 스냅샷입니다. 엑셀 수식 자동 재계산이 아니며 입력 수정 후 앱에서 재생성하세요.',...Object.fromEntries(m.warnings.map((v,i)=>['주의'+(i+1),v]))}).map(([항목,값])=>({항목,값}));return {공사비총괄:data.공사비총괄,내역서:data.내역서,구간토공량:data.구간토공량,단면적집계:data.단면적집계,단면분할산출:data.단면분할산출,토량환산:data.토량환산,입력측점:data.입력측점,산출조건:data.산출조건};
}
const api={parse,strips,build,example,workbook};if(typeof module!=='undefined')module.exports=api;else root.Earthworks=api;
})(typeof window==='undefined'?globalThis:window);