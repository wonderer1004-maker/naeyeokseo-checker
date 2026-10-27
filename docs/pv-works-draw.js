(function(root){'use strict';
const G=typeof EarthDraw!=='undefined'?EarthDraw:require('./earthworks-draw.js');
const F=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:3});
function scene(kind,m,start=0){
 const c=m.c,items=[],R=(x,y,w,h,fill,stroke)=>items.push({t:'r',x,y,w,h,fill,stroke}),L=(x,y,x2,y2,stroke,width=1)=>items.push({t:'l',x,y,x2,y2,stroke,width}),P=(points,fill,stroke,width=1)=>items.push({t:'p',points,fill,stroke,width}),T=(x,y,text,size=13,fill='#183153',bold=false)=>items.push({t:'t',x,y,text:String(text),size,fill,bold});
 const titles={module:'모듈 설치 · 스트링 배정 평면도',electric:'전기공사 · 배선 경로 개념도',single:'전기 단선 구성도 (정격·보호협조 미설계)',structure:'구조물 · 가대 · 기초 배치도',detail:'표준 가대 · 독립기초 개념 단면'};
 R(0,0,1100,720,'#fff','#b8c8db');R(0,0,1100,82,'#183153');T(25,35,titles[kind],22,'#fff',true);T(25,63,m.issues.length?'설계조건 오류 '+m.issues.length+'건 · 확인 전 시공용 사용 불가':'입력 가정 기반 물량 검토 · 전기/구조 안전성 및 실시설계 도면 아님',12,'#cbd5e1');
 if(['module','electric','structure'].includes(kind)){
  const k=500/m.layout.side,xy=p=>[80+p[0]*k,635-p[1]*k];
  R(55,110,555,550,'#f8fafc','#dbe4ee');P([[0,0],[m.layout.side,0],[m.layout.side,m.layout.side],[0,m.layout.side],[0,0]].map(xy),'none','#183153',1.4);
  for(const p of m.modules)P([...p.points,p.points[0]].map(xy),kind==='module'?(p.string?'#93c5fd':'#fdba74'):'#e2e8f0','#cbd5e1',.4);
  if(kind==='module'){for(const s of m.strings){P(s.modules.map(p=>xy(p.center)),'none','#0f766e',.8);if(m.strings.length<=100){const p=xy(s.modules[0].center);T(p[0],p[1]-3,s.id,8);}}}
  if(kind==='electric'){for(const p of m.tray.segments)P(p.map(xy),'none','#94a3b8',2.6);for(const s of m.strings){P(s.plus.map(xy),'none','#dc2626',.7);P(s.minus.map(xy),'none','#2563eb',.7);}for(const p of m.pe.segments)P(p.map(xy),'none','#d97706',1);for(const i of m.inverters){P(i.acPath.map(xy),'none','#0f766e',2);const p=xy(i.position);R(p[0]-5,p[1]-8,10,16,'#0f766e');T(p[0]+9,p[1],i.id,9);}const p=xy(m.cabinet);R(p[0]-6,p[1]-5,12,10,'#183153');T(p[0]+10,p[1],'AC',9);}
  if(kind==='structure'){for(const r of m.racks){P([...r.boundary,r.boundary[0]].map(xy),'none','#d97706');for(const p of r.rails)P(p.map(xy),'none','#2563eb',1.2);for(const p of r.beams)P(p.map(xy),'none','#64748b',.6);const q=xy(r.base);T(q[0],q[1]+13,r.id,10);}for(const f of m.foundations)P([...f.corners,f.corners[0]].map(xy),'#fef3c7','#92400e',.7);}
  T(70,686,'북 N ↑ · 가정 부지 '+F(m.layout.side)+'m 정사각형 · 지역 좌표',12);
  R(640,110,430,540,'#f8fafc','#dbe4ee');
  const rows=kind==='module'?[['설치 모듈',m.modules.length+' 장'],['설치 DC',F(m.layout.capacityKw)+' kW'],['접속 DC',F(m.electrical.dcKw)+' kW'],['스트링',m.strings.length+' 회로 / '+c.series+'직렬'],['미접속',m.electrical.unconnected+' 장'],['인버터 AC',F(m.electrical.acKw)+' kW'],['배정 원칙','행 안에서 완전 스트링만 배정']]:kind==='electric'?[['인버터',m.inverters.length+' 대'],['DC 단심',F(m.bill.find(r=>r.id==='dc').수량)+' m (+/- 합계)'],['AC 4심',F(m.bill.find(r=>r.id==='ac').수량)+' m (심수 미곱)'],['트레이',F(m.bill.find(r=>r.id==='tray').수량)+' m'],['PE 접지선',F(m.bill.find(r=>r.id==='pe').수량)+' m'],['DC 경로','적색 + / 청색 -'],['AC / PE','청록 AC / 주황 PE']]:[['연속 가대',m.racks.length+' 열'],['지주 / 기초',m.foundations.length+' 개'],['레일 순길이',F(m.structure.railNet)+' m'],['레일 정척 구매',m.structure.railStock+' 본 × '+c.railStock+'m'],['중간 / 단부 클램프',m.bill.find(r=>r.id==='mid').수량+' / '+m.bill.find(r=>r.id==='end').수량+' 개'],['기초 콘크리트',F(m.structure.concrete)+' ㎥'],['강재 순중량',F(m.structure.steelNet)+' kg']];
  rows.forEach(([label,value],i)=>{const y=145+i*62;T(660,y,label,12,'#64748b');T(660,y+27,value,16,'#183153',true);});
 }else if(kind==='single'){
  if(!m.inverters.length){T(50,180,'접속 스트링·인버터 없음: 직렬 수와 미접속 모듈을 확인하세요.',18,'#b91c1c',true);return {width:1100,height:720,items};}
  const list=m.inverters.slice(start,start+7),bottom=180+list.length*62;L(995,130,995,bottom,'#183153',2);
  list.forEach((inv,i)=>{const y=135+i*62;R(30,y,205,42,'#eff6ff','#2563eb');T(42,y+18,inv.strings.length+' 스트링 × '+c.series+'직렬',12);T(42,y+35,F(inv.dcKw)+' kW DC',11);L(235,y+21,275,y+21,'#dc2626',2);R(275,y,160,42,'#fff7ed','#d97706');T(288,y+25,c.externalDc?'외장 DC 기기':'인버터 내장 가정',12);L(435,y+21,480,y+21,'#dc2626',2);R(480,y,210,42,'#e6f4ef','#0f766e');T(492,y+18,inv.id+' / '+c.inverterKw+' kW AC',12);T(492,y+35,'DC/AC '+inv.dcAc.toFixed(3),11);L(690,y+21,730,y+21,'#0f766e',2);R(730,y,205,42,'#f1f5f9','#64748b');T(742,y+24,'AC 분기차단 정격 미선정',12);L(935,y+21,995,y+21,'#0f766e',2);});
  L(995,bottom,995,bottom+10,'#183153',2);R(755,bottom+10,280,52,'#183153');T(769,bottom+32,'AC 집합반 → 주차단 → 계통점',13,'#fff',true);
  T(30,630,'표시 인버터 '+(start+1)+'~'+Math.min(start+7,m.inverters.length)+' / 전체 '+m.inverters.length,12);
  T(30,662,'퓨즈·개폐기·SPD 내장 여부는 제조사 자료 확인. 전선/차단기/보호협조/계통연계 상세 미선정.',12);
  T(30,690,'구성도는 회로 연결 관계를 위한 비축척 도식입니다. 기기 정격 내 입력값 비교는 안전 적합 판정이 아닙니다.',11,'#64748b');
 }else{
  const h=m.structure.rearHeight,span=m.structure.beamFoot,k=Math.min(430/(span+c.footW+2*c.working),380/(h+c.footD+c.blinding)),x0=100+(c.footW/2+c.working)*k,y0=165+h*k,xy=(x,z)=>[x0+x*k,y0-z*k];
  L(60,y0,630,y0,'#64748b',1);
  for(const [x,height]of [[0,c.frontHeight],[span,h]]){const p=xy(x-c.footW/2,0);R(p[0],p[1],c.footW*k,c.footD*k,'#e2e8f0','#64748b');const b=xy(x-c.footW/2-c.blindOverhang,-c.footD);R(b[0],b[1],(c.footW+2*c.blindOverhang)*k,c.blinding*k,'#fef3c7','#b7791f');P([xy(x,0),xy(x,height)],'none','#183153',4);}
  P([xy(0,c.frontHeight),xy(span,h)],'none','#2563eb',4);P([xy(0,0),xy(span,h)],'none','#64748b',2);
  T(65,135,'횡보 경사길이 '+F(m.structure.beamLength)+'m / 경사 '+c.tilt+'°',15,'#183153',true);
  T(65,610,'전면 '+F(c.frontHeight)+'m / 후면 '+F(h)+'m / 지주 전후 수평간격 '+F(span)+'m',12);
  T(65,641,'가새 길이 '+F(m.structure.braceEach)+'m, 가대 양끝 각1개 가정',12);
  R(675,120,395,540,'#f8fafc','#dbe4ee');
  const notes=['독립기초 '+c.footW+' × '+c.footL+' × '+c.footD+' m','기초 '+m.foundations.length+'개 / 앵커 '+c.anchors+'개/기초','버림 두께 '+c.blinding+'m / 각면 '+c.blindOverhang+'m','지주 간격 ≤ '+c.span+'m (기하 배치값)','철근 '+c.rebarKg+'kg/㎥ 개략계수','철근 배근표·앵커 정착·용접 상세 미생성','풍설·지진·지내력·좌굴·기초 안정 미검증'];
  notes.forEach((v,i)=>T(693,155+i*66,v,13,i<4?'#183153':'#92400e',i<2));
  T(30,694,'치수에 따른 물량 산정용 개념 단면. 부재 규격·기초 크기는 실제 하중 및 지반 조건으로 별도 설계해야 합니다.',11,'#64748b');
 }
 return {width:1100,height:720,items};
}
function dxf(m){
 let out='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
 const poly=(layer,pts,closed=false)=>{out+='0\nLWPOLYLINE\n100\nAcDbEntity\n8\n'+layer+'\n100\nAcDbPolyline\n90\n'+pts.length+'\n70\n'+(closed?1:0)+'\n'+pts.map(([x,y])=>'10\n'+x+'\n20\n'+y+'\n').join('');};
 const text=(x,y,t,size=.6)=>{out+='0\nTEXT\n100\nAcDbEntity\n8\nNOTES\n100\nAcDbText\n10\n'+x+'\n20\n'+y+'\n30\n0\n40\n'+size+'\n1\n'+t+'\n';};
 const box=(layer,x,y,w,h)=>poly(layer,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],true);
 poly('SITE',[[0,0],[m.layout.side,0],[m.layout.side,m.layout.side],[0,m.layout.side]],true);
 for(const p of m.modules)poly(p.string?'PV_MODULE':'UNCONNECTED',p.points,true);
 for(const s of m.strings){poly('DC_PLUS',s.plus);poly('DC_MINUS',s.minus);}
 for(const p of m.pe.segments)poly('PE',p);
 for(const inv of m.inverters){poly('AC_ROUTE',inv.acPath);box('INV_SYMBOL',inv.position[0]-.4,inv.position[1]-.4,.8,.8);text(inv.position[0]+.5,inv.position[1],inv.id,.4);}
 for(const r of m.racks){poly('RACK',r.boundary,true);for(const line of r.rails)poly('RAIL',line);for(const line of r.beams)poly('BEAM',line);}
 for(const f of m.foundations)poly('FOUNDATION',f.corners,true);
 text(0,m.layout.side+3,'LOCAL PLAN IN m / CABLE ORTHO ASSUMPTION / SYMBOLS NOT TO SCALE');
 text(0,m.layout.side+5,'INPUT REVIEW ONLY / NOT CONSTRUCTION DESIGN / CONFIG ERRORS: '+m.issues.length);
 const x=m.layout.side+15,span=m.structure.beamFoot,h=m.structure.rearHeight,c=m.c;
 for(const [dx,height]of [[0,c.frontHeight],[span,h]]){poly('SECTION_POST',[[x+dx,0],[x+dx,height]]);box('SECTION_CONCRETE',x+dx-c.footW/2,-c.footD,c.footW,c.footD);box('SECTION_BLIND',x+dx-c.footW/2-c.blindOverhang,-c.footD-c.blinding,c.footW+2*c.blindOverhang,c.blinding);}
 poly('SECTION_BEAM',[[x,c.frontHeight],[x+span,h]]);poly('SECTION_BRACE',[[x,0],[x+span,h]]);
 text(x,h+2,'TYPICAL FRAME / H:V=1:1 / FOOTING '+c.footW+'x'+c.footL+'x'+c.footD);
 text(x,h+4,'REBAR kg/m3 ASSUMPTION ONLY / ANCHORS PER FOOTING '+c.anchors+' / SEE PDF');
 const y=-20-m.layout.side;
 m.inverters.forEach((inv,i)=>{const yy=y-i*6;box('SLD_PV',0,yy,12,3);box('SLD_INV',22,yy,12,3);box('SLD_AC_BRANCH',43,yy,12,3);poly('SLD_DC',[[12,yy+1.5],[22,yy+1.5]]);poly('SLD_AC',[[34,yy+1.5],[43,yy+1.5],[65,yy+1.5]]);text(.5,yy+1,'PV '+inv.strings.length+'x'+c.series);text(22.5,yy+1,inv.id+' '+c.inverterKw+'kW');});
 if(m.inverters.length)poly('SLD_BUS',[[65,y+1.5],[65,y-(m.inverters.length-1)*6+1.5],[75,y-(m.inverters.length-1)*6+1.5]]);
 text(0,y+6,'SINGLE LINE SCHEMATIC - NOT TO SCALE / BREAKER,CABLE,PROTECTION RATINGS NOT SELECTED');
 return out+'0\nENDSEC\n0\nEOF\n';
}
const api={scene,svg:s=>G.svg(s),canvas:(c,s,b)=>G.canvas(c,s,b),dxf};if(typeof module!=='undefined')module.exports=api;else root.PvDraw=api;
})(typeof window==='undefined'?globalThis:window);