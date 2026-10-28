(function(root){'use strict';
const G=typeof EarthDraw!=='undefined'?EarthDraw:require('./earthworks-draw.js');
const Sheet=typeof EngineeringSheet!=='undefined'?EngineeringSheet:require('./engineering-sheet.js');
const F=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:3});
function scene(kind,m,start=0){
 const c=m.c,S=Sheet,p=S.pen,s=S.make({project:m.title,source:m.source,title:({module:'모듈 설치 및 스트링 평면도',electric:'전력간선 및 접지 배선 평면도',single:'태양광 발전시스템 단선도',structure:'구조물 및 기초 배치 평면도',detail:'표준 가대 및 독립기초 단면도'})[kind],no:({module:'EA-001',electric:'EE-001',single:'ES-001',structure:'ST-001',detail:'ST-002'})[kind]+(kind==='single'&&start?'-'+(Math.floor(start/7)+1):''),scale:kind==='single'?'NONE':'AUTO FIT'});
 const q=p(s),F=S.F,line=(pts,width=.7,dash)=>{for(let i=1;i<pts.length;i++)q.L(...pts[i-1],...pts[i],'#111',width,dash);};
 q.T(48,58,'NOTE',11,'#111',true);q.T(98,58,(m.issues.length?'설계조건 오류 '+m.issues.length+'건 / ':'')+'입력 가정 기반 검토도 / 실제 필지·정격·접합·구조 안전 검증 전',10);
 if(['module','electric','structure'].includes(kind)){
  const k=540/m.layout.side,xy=v=>[140+v[0]*k,680-v[1]*k],closed=v=>[...v,v[0]].map(xy);
  q.P(closed([[0,0],[m.layout.side,0],[m.layout.side,m.layout.side],[0,m.layout.side]]),'none','#111',1.4);
  for(const module of m.modules){q.P(closed(module.points),'none',kind==='module'?'#222':'#bbb',.45);if(kind==='module'&&!module.string){const a=xy(module.points[0]),b=xy(module.points[2]);q.L(...a,...b,'#555',.5);}}
  if(kind==='module')for(const st of m.strings){line(st.modules.map(v=>xy(v.center)),.65);const a=xy(st.modules[0].center);q.T(a[0]+2,a[1]-3,st.id,7);}
  if(kind==='electric'){
   for(const a of m.tray.segments)line(a.map(xy),2);
   for(const st of m.strings){line(st.plus.map(xy),.55);line(st.minus.map(xy),.55,[3,2]);}
   for(const a of m.pe.segments)line(a.map(xy),.85,[6,2,1,2]);
   for(const inv of m.inverters){line(inv.acPath.map(xy),1.1);const a=xy(inv.position);q.R(a[0]-5,a[1]-7,10,14,'#fff');q.T(a[0]+8,a[1]-3,inv.id,8);}
   const a=xy(m.cabinet);q.R(a[0]-6,a[1]-5,12,10,'#fff','#111',1.2);q.T(a[0]+10,a[1]+3,'AC PANEL',8);
  }
  if(kind==='structure'){
   for(const rack of m.racks){q.P(closed(rack.boundary),'none','#555',.7);rack.rails.forEach(v=>line(v.map(xy),1.1));rack.beams.forEach(v=>line(v.map(xy),.55));const a=xy(rack.base);q.C(a[0]-17,a[1],10);q.T(a[0]-17,a[1]+3,rack.id,7,'#111',false,'center');}
   for(const f of m.foundations)q.P(closed(f.corners),'#ddd','#111',.6);
  }
  S.dim(s,[140,680],[680,680],F(m.layout.side)+' m (가정)',25);S.dim(s,[140,680],[140,140],F(m.layout.side)+' m',-37);S.north(s,755,110);
  const rows=kind==='module'?[['모듈 규격',S.short(c.moduleSpec||'규격 미입력',24)],['모듈 정격',c.modulePower+' W / 장'],['설치 수량',m.modules.length+' 장'],['설치 DC',F(m.layout.capacityKw)+' kW'],['접속 DC',F(m.electrical.dcKw)+' kW'],['스트링 구성',c.series+' 직렬 × '+m.strings.length+' 회로'],['미접속 수량',m.electrical.unconnected+' 장'],['모듈 경사 / 방위',c.tilt+'° / '+c.azimuth+'°'],['행 피치',F(m.layout.pitch)+' m']]:kind==='electric'?[['인버터',m.inverters.length+' 대 × '+c.inverterKw+' kW'],['DC 단심 (+/- 합)',F(m.bill.find(r=>r.id==='dc').수량)+' m'],['AC 4심 선로',F(m.bill.find(r=>r.id==='ac').수량)+' m'],['케이블 트레이',F(m.bill.find(r=>r.id==='tray').수량)+' m'],['PE 접지선',F(m.bill.find(r=>r.id==='pe').수량)+' m'],['AC 선간전압',c.acVoltage+' V'],['기기·선로 위치','직교 개념 경로']]:[['연속 가대',m.racks.length+' 열'],['지주 / 독립기초',m.foundations.length+' 개'],['레일 순길이',F(m.structure.railNet)+' m'],['레일 정척 구매',m.structure.railStock+' 본 × '+c.railStock+'m'],['기초 크기 (m)',c.footW+' × '+c.footL+' × '+c.footD],['콘크리트',F(m.structure.concrete)+' ㎥'],['강재 순중량',F(m.structure.steelNet)+' kg']];
  q.T(850,97,'명세 / SCHEDULE',12,'#111',true);S.table(s,850,110,355,rows);
  const yy=145+rows.length*30;q.T(850,yy,'범례 / LEGEND',11,'#111',true);
  if(kind==='electric'){q.L(850,yy+27,888,yy+27,'#111',.8);q.T(900,yy+31,'DC (+) 실선 / (-) 파선',10);q.L(850,yy+52,888,yy+52,'#111',2);q.T(900,yy+56,'공용 트레이',10);q.L(850,yy+77,888,yy+77,'#111',.8,[6,2,1,2]);q.T(900,yy+81,'PE 접지선 (개념 경로)',10);}
  else{q.R(850,yy+20,24,12,'none');q.T(885,yy+31,kind==='module'?'태양광 모듈 / 선은 스트링 연결':'모듈 외곽 및 가대 부재',10);q.R(850,yy+45,10,10,'#ddd');if(kind==='module'){q.L(850,yy+45,860,yy+55);q.L(850,yy+55,860,yy+45);}q.T(885,yy+55,kind==='module'?'X 표시: 미접속 모듈':'독립기초 위치',10);}
  q.T(850,yy+120,'지역 좌표: x=동 / y=북 / 단위 m',10);q.T(850,yy+144,'자동 맞춤 배치 / 실측 축척 도면 아님',10);q.T(850,yy+168,'설계조건 검토 '+m.issues.length+'건 / 상세 내역 별첨',10);
 }else if(kind==='single'){
  if(!m.inverters.length){q.T(120,250,'접속 스트링·인버터 없음: 직렬 수와 미접속 모듈을 확인하세요.',18);return s;}
  const list=m.inverters.slice(start,start+7),gap=list.length>1?Math.min(160,450/(list.length-1)):0,first=list.length===1?310:155,bottom=first+(list.length-1)*gap;
  q.T(140,100,'AC 집합 모선',11,'#111',true,'center');q.L(140,120,140,bottom+35,'#111',2);
  list.forEach((inv,i)=>{const y=first+i*gap;
   q.L(140,y,220,y);q.C(222,y,2);q.L(224,y,246,y-14);q.L(247,y,280,y);q.T(210,y+27,'MCCB',9);q.T(210,y+41,'정격 미선정',8);
   q.L(280,y,420,y);q.R(420,y-23,82,46,'#fff','#111',1.1);q.L(420,y+23,502,y-23);q.T(437,y-5,'~',20);q.T(480,y+16,'=',17);q.T(461,y-34,inv.id+' / '+c.inverterKw+' kW AC',11,'#111',true,'center');q.T(520,y+33,'DC '+F(inv.dcKw)+'kW',9);
   q.L(502,y,650,y);
   if(c.externalDc){q.R(650,y-6,24,12,'#fff');q.L(674,y,700,y);q.L(700,y,722,y-14);q.L(724,y,750,y);q.T(650,y+31,'DC 퓨즈·개폐기 / 정격 별도',9);}else{q.L(650,y,750,y);q.T(650,y+31,'DC 보호기기 내장 가정',9);}
   q.L(750,y,875,y);q.L(875,y-17,875,y+17);
   for(const dy of [-17,0,17]){q.L(875,y+dy,958,y+dy);for(let j=0;j<3;j++)q.R(958+j*19,y+dy-6,17,12,'none','#111',.6);}
   q.T(1050,y-3,'모듈 '+c.series+' 직렬',10);q.T(1050,y+15,inv.strings.length+' 스트링 묶음',10);
  });
  q.L(140,bottom+35,140,bottom+57);q.R(50,bottom+57,290,44,'#fff','#111',1.2);q.T(195,bottom+75,'AC 집합반 / 주차단 / 계통 연계점',11,'#111',true,'center');q.T(195,bottom+91,c.acVoltage+'V / 정격·보호협조·접속점 미선정',9,'#111',false,'center');
  q.T(530,706,'표시: 인버터 '+(start+1)+'~'+Math.min(start+7,m.inverters.length)+' / 전체 '+m.inverters.length+'대',10);
  q.T(48,731,'묶음 회로 기호입니다. 개별 MPPT·모듈 배정은 수량표 참조. 전선·차단기·SPD·접지·계통 연계 상세는 별도 설계.',10);
 }else{
  const h=m.structure.rearHeight,span=m.structure.beamFoot,k=Math.min(430/(span+c.footW+2*c.working),350/(h+c.footD+c.blinding)),x0=145+(c.footW/2+c.working)*k,y0=135+h*k,xy=(x,z)=>[x0+x*k,y0-z*k];
  q.T(285,105,'A - A  표준 가대 단면',13,'#111',true,'center');q.L(70,y0,665,y0,'#555',.8);
  for(const[x,height]of [[0,c.frontHeight],[span,h]]){const a=xy(x-c.footW/2,0);q.R(a[0],a[1],c.footW*k,c.footD*k,'#eee');const b=xy(x-c.footW/2-c.blindOverhang,-c.footD);q.R(b[0],b[1],(c.footW+2*c.blindOverhang)*k,c.blinding*k,'#ddd');q.L(...xy(x,0),...xy(x,height),'#111',2);S.dim(s,xy(x,0),xy(x,height),F(height*1000),x===0?-32:35);}
  q.L(...xy(0,c.frontHeight),...xy(span,h),'#111',2.2);q.L(...xy(0,0),...xy(span,h),'#555',1);
  S.dim(s,xy(0,c.frontHeight),xy(span,h),F(m.structure.beamLength*1000)+' (경사길이)',-29);
  S.dim(s,xy(0,-c.footD-c.blinding),xy(span,-c.footD-c.blinding),F(span*1000),33);
  q.T(80,608,'부재: '+S.short(c.beamSpec||'횡보 규격 미입력',36),11);q.T(80,632,'지주: '+S.short(c.postSpec||'지주 규격 미입력',36),11);q.T(80,656,'모듈 경사 '+c.tilt+'° / 가새 '+F(m.structure.braceEach*1000)+'mm (양끝 각 1개 가정)',11);
  q.T(935,105,'독립기초 표준 단면',13,'#111',true,'center');
  const fk=Math.min(240/(c.footW+2*c.blindOverhang+.2),335/(c.footD+c.blinding)),fx=935-c.footW*fk/2,fy=175;
  q.L(775,fy,1190,fy,'#555');q.R(fx,fy,c.footW*fk,c.footD*fk,'#eee');q.R(fx-c.blindOverhang*fk,fy+c.footD*fk,(c.footW+2*c.blindOverhang)*fk,c.blinding*fk,'#ddd');
  for(let y=fy+12;y<fy+c.footD*fk;y+=17)q.L(fx+3,y,fx+c.footW*fk-3,y,'#aaa',.4);
  S.dim(s,[fx,fy+c.footD*fk+c.blinding*fk],[fx+c.footW*fk,fy+c.footD*fk+c.blinding*fk],F(c.footW*1000),28);
  S.dim(s,[fx+c.footW*fk,fy],[fx+c.footW*fk,fy+c.footD*fk],F(c.footD*1000),-32);
  S.table(s,770,570,420,[['기초 폭×길이×깊이(mm)',F(c.footW*1000)+'×'+F(c.footL*1000)+'×'+F(c.footD*1000)],['앵커 수량',c.anchors+'개 / 기초 (상세 별도)'],['버림 두께',F(c.blinding*1000)+'mm'],['콘크리트 / 철근',S.short(c.concreteSpec||'미입력',13)+' / 계수 물량']]);
  q.T(48,715,'치수 단위: mm / 입력 m를 환산. 철근 배근·앵커 정착·접합 상세는 생성하지 않습니다.',10);
  q.T(48,735,'지상형 콘크리트 독립기초 개념 모델 / 풍설·지진·좌굴·지내력·기초 안정 검증 전.',10);
 }
 return s;
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
 const sheets=['module','electric','structure','detail'].map(k=>scene(k,m));for(let i=0;i<Math.max(m.inverters.length,1);i+=7)sheets.push(scene('single',m,i));return Sheet.appendCad(out+'0\nENDSEC\n0\nEOF\n',sheets,m.layout.side*3+50,.08);
}
const api={scene,svg:s=>Sheet.svg(s),canvas:(c,s,b)=>Sheet.canvas(c,s,b),dxf};if(typeof module!=='undefined')module.exports=api;else root.PvDraw=api;
})(typeof window==='undefined'?globalThis:window);