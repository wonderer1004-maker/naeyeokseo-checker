(function(root){'use strict';
const S=typeof EngineeringSheet!=='undefined'?EngineeringSheet:require('./engineering-sheet.js'),F=S.F;
function profiles(m){const b=m.grid.bounds;return [{axis:'y',value:(b.ymin+b.ymax)/2,title:'종단면도 · 동서 중앙선',no:'TE-002'},...[.25,.5,.75].map((f,i)=>({axis:'x',value:b.xmin+(b.xmax-b.xmin)*f,title:'횡단면도 · 남북 '+Math.round(f*100)+'%선',no:'TE-00'+(i+3)}))];}
function base(m,title,no){return S.make({project:m.title,source:m.source+' / '+m.datum,title,no,scaleNote:'지형 표고 격자 보간 · 수량 검토용 / 경계 밖 사면 미포함'});}
function plan(m){const s=base(m,'지형·계획 평면도 · 절성토 구분','TE-001'),p=S.pen(s),b=m.grid.bounds,k=Math.min(770/(b.xmax-b.xmin),590/(b.ymax-b.ymin)),xy=a=>[70+(a[0]-b.xmin)*k,690-(a[1]-b.ymin)*k];
 for(const q of m.pieces){const pts=q.points.map(xy);p.P([...pts,pts[0]],q.cut>=q.fill?'#d1d1d1':'#f3f3f3','#aaa',.25);}
 const poly=m.grid.polygon.map(xy);p.P([...poly,poly[0]],'none','#111',1.8);S.north(s,830,80);
 S.table(s,900,100,300,[['수평면적',F(m.area)+'㎡'],['절토',F(m.cut)+'㎥'],['성토',F(m.fill)+'㎥'],['계획고 · 중심',F(m.plan.elevation)+'m'],['동 / 북 경사',F(m.plan.slopeX)+' / '+F(m.plan.slopeY)+'%'],['격자간격 X/Y',F(m.grid.dx)+' / '+F(m.grid.dy)+'m'],['표고점',m.heights.length+'점']]);
 p.R(915,350,15,15,'#d1d1d1','#111');p.T(940,362,'절토 우세 영역',11);p.R(915,385,15,15,'#f3f3f3','#111');p.T(940,397,'성토 우세 영역',11);
 p.T(900,450,'좌표: WGS84 → 부지 중심 지역좌표',10);p.T(900,477,'X: 동쪽 + / Y: 북쪽 + / 단위 m',10);p.T(900,504,'면적·부피: 수평면 기준 적분',10);p.T(900,531,'사면·표토·암종·옹벽·배수 제외',10);p.T(900,558,'건물·수목 높이를 지반으로 사용하지 않음',10);
 for(const f of profiles(m)){const a=f.axis==='x'?[f.value,b.ymin]:[b.xmin,f.value],c=f.axis==='x'?[f.value,b.ymax]:[b.xmax,f.value];p.L(...xy(a),...xy(c),'#555',.7,[6,3]);}
 S.dim(s,xy([b.xmin,b.ymin]),xy([b.xmax,b.ymin]),F(b.xmax-b.xmin)+'m',24);return s;
}
function profile(m,def){const s=base(m,def.title,def.no),p=S.pen(s),segments=root.TerrainEarthCore?root.TerrainEarthCore.transect(m,def.axis,def.value):require('./terrain-earth-core.js').transect(m,def.axis,def.value),idx=def.axis==='x'?1:0;
 if(!segments.length){p.T(630,360,'지정 단면선이 부지 내부와 만나지 않습니다.',18,'#111',false,'center');return s;}
 const points=segments.flat(),xs=points.map(p=>p[idx]),zs=points.flatMap(a=>[a[2],a[2]-a[3]]),xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(...zs)-.5,zmax=Math.max(...zs)+.5,kx=1070/Math.max(.01,xmax-xmin),kz=430/Math.max(.01,zmax-zmin),xy=(x,z)=>[105+(x-xmin)*kx,580-(z-zmin)*kz];
 for(let i=0;i<=5;i++){const z=zmin+(zmax-zmin)*i/5,y=xy(xmin,z)[1];p.L(100,y,1180,y,'#ccc',.5);p.T(88,y+4,F(z),10,'#111',false,'right');}
 p.T(90,95,'표고(m) · '+m.datum,11);p.T(105,645,'수평거리 지역좌표 '+(def.axis==='x'?'Y(북쪽 +)':'X(동쪽 +)')+' / m',11);
 for(const [a,b]of segments){p.L(...xy(a[idx],a[2]),...xy(b[idx],b[2]),'#111',1.3);p.L(...xy(a[idx],a[2]-a[3]),...xy(b[idx],b[2]-b[3]),'#555',1,[6,3]);}
 for(let i=0;i<=8;i++){const x=xmin+(xmax-xmin)*i/8;p.T(xy(x,zmin)[0],606,F(x),10,'#111',false,'center');}
 p.L(790,690,840,690,'#111',1.3);p.T(850,695,'현황 지형',11);p.L(990,690,1040,690,'#555',1,[6,3]);p.T(1050,695,'계획 지형',11);
 p.T(105,680,'단면 위치: '+(def.axis==='x'?'X':'Y')+'='+F(def.value)+'m / H:V='+F(kx/kz)+':1 (자동 맞춤)',11);p.T(105,710,'경계 밖 및 부지 밖 구간은 연결하지 않습니다. 단면은 삼각망의 선형 보간값입니다.',11);return s;
}
function tableScene(m,title,no,headers,rows,widths){const s=base(m,title,no),p=S.pen(s);let y=105;const x=65,rowH=27;let xx=x;for(let i=0;i<headers.length;i++){p.T(xx+5,y,headers[i],10,'#111',true);xx+=widths[i];}p.L(60,y+10,1200,y+10);y+=rowH;for(const row of rows){let xx=x;row.forEach((v,i)=>{p.T(xx+5,y,typeof v==='number'?F(v):String(v).slice(0,75),10);xx+=widths[i];});p.L(60,y+8,1200,y+8,'#ddd',.4);y+=rowH;}return s;}
function scenes(m){const out=[plan(m),...profiles(m).map(f=>profile(m,f))];
 const rows=[];for(let j=1;j<=m.grid.ny;j++){const cells=m.cells.filter(c=>c.행===j);if(cells.length)rows.push([j,cells.length,cells.reduce((s,c)=>s+c.수평면적,0),cells.reduce((s,c)=>s+c.절토량,0),cells.reduce((s,c)=>s+c.성토량,0)]);}
 for(let start=0;start<rows.length;start+=20)out.push(tableScene(m,'격자행별 토공 수량산출서','TQ-'+String(start/20+1).padStart(3,'0'),['격자행','포함 셀','수평면적 ㎡','절토량 ㎥','성토량 ㎥'],rows.slice(start,start+20),[150,150,260,260,260]));
 out.push(tableScene(m,'토공 내역서 · 토량환산','TB-001',['항목','수량 ㎥','단가 원','금액 원'],m.estimate.costs.map(r=>[r.항목,r.수량,r.단가,r.금액]).concat([['직접공사비','','',m.estimate.budget.direct],['예비비','','',m.estimate.budget.contingency],['부가세','','',m.estimate.budget.vat],['총액','','',m.estimate.budget.total],...Object.entries(m.estimate.balance).map(([k,v])=>[k,v,'',''])]),[480,220,220,220]));
 out.push(tableScene(m,'자료 출처 · 산출 조건','TN-001',['구분','기록'],[['자료',m.source],['표고조회 시각',m.sampledAt],['수직기준',m.datum],['계산','격자 삼각망을 부지경계로 잘라 절토·성토 영교차를 분할 적분'],['계획고','부지 꼭짓점 평균 좌표를 기준으로 동·북 경사 적용'],['정확도','조회 간격은 원자료 해상도·표고 정확도를 의미하지 않음'],['수직기준 검토','계획고와 제공 표고의 수직기준 일치 여부 확인 필요'],['제외 범위','부지 밖 사면 접속, 표토, 암 분류, 배수, 옹벽, 추가 운반'],['단가 출처',m.costSource||'미입력: 금액은 미완성 견적'],['견적 기준','성토 기하체적을 다짐량으로 가정하고 L·C·재사용률 적용'],['용도','사업성·개략 수량 검토 / 현황측량 및 실시설계로 검증']],[190,950]));return out;
}
function dxf(m){let d='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';const line=(a,b,layer)=>{d+='0\nLINE\n100\nAcDbEntity\n8\n'+layer+'\n100\nAcDbLine\n10\n'+a[0]+'\n20\n'+a[1]+'\n30\n'+a[2]+'\n11\n'+b[0]+'\n21\n'+b[1]+'\n31\n'+b[2]+'\n';};for(const q of m.pieces)for(let i=0;i<q.points.length;i++){const a=q.points[i],b=q.points[(i+1)%q.points.length];line(a,b,'TERRAIN_3D');line([a[0],a[1],a[2]-a[3]],[b[0],b[1],b[2]-b[3]],'DESIGN_3D');}d+='0\nENDSEC\n0\nEOF\n';return S.appendCad(d,scenes(m),m.grid.bounds.xmax+100);}
const api={plan,profile,profiles,scenes,dxf};if(typeof module!=='undefined')module.exports=api;else root.TerrainEarthDraw=api;
})(typeof window==='undefined'?globalThis:window);
