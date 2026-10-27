(function(root){'use strict';
const W=typeof Earthworks!=='undefined'?Earthworks:require('./earthworks-core.js');
const fmt=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:3});
function scene(kind,m,index=0){
 const height=kind==='plan'?560:340,a=[],R=(x,y,w,h,fill,stroke)=>a.push({t:'r',x,y,w,h,fill,stroke}),L=(x,y,x2,y2,stroke,width=1)=>a.push({t:'l',x,y,x2,y2,stroke,width}),T=(x,y,text,size=13,fill='#183153',bold=false)=>a.push({t:'t',x,y,text:String(text),size,fill,bold}),P=(points,fill,stroke,width=1)=>a.push({t:'p',points,fill,stroke,width});
 R(0,0,1100,height,'#fff','#bdcbdc');R(0,0,1100,65,'#183153');const s=m.stations[index];
 T(24,29,kind==='plan'?'평면도 / 직선 기준선 지역 좌표':kind==='long'?'종단면도 / 중심선 offset = 0':'횡단면도 / STA '+fmt(s.station),20,'#fff',true);
 T(24,51,kind==='plan'?'절토(붉은색) · 성토(파란색) · 입력 폭 기준 개략 구획':'현황고(갈색) · 계획고(청록색) · 절토(붉은색) · 성토(파란색)',11,'#cbd5e1');
 if(kind==='plan'){
  const st0=m.stations[0].station,len=m.stations.at(-1).station-st0,lo=m.offsets[0],hi=m.offsets.at(-1),k=Math.min(930/len,340/(hi-lo)),ox=80+(930-len*k)/2,oy=440-(340-(hi-lo)*k)/2,xy=(st,of)=>[ox+(st-st0)*k,oy-(of-lo)*k];
  for(let i=1;i<m.stations.length;i++)for(let j=1;j<m.offsets.length;j++){const b=m.stations[i],c=m.stations[i-1],p1=xy(c.station,m.offsets[j]),p2=xy(b.station,m.offsets[j-1]),depth=[c.points[j-1],c.points[j],b.points[j-1],b.points[j]].reduce((v,p)=>v+p.existing-p.design,0)/4;R(p1[0],p1[1],p2[0]-p1[0],p2[1]-p1[1],depth>0?'#fee2e2':depth<0?'#dbeafe':'#f1f5f9','#e2e8f0');}
  const p0=xy(st0,lo);R(p0[0],xy(st0,hi)[1],len*k,(hi-lo)*k,'none','#183153');
  for(let i=0;i<m.stations.length;i++){const s=m.stations[i],top=xy(s.station,hi),bottom=xy(s.station,lo);L(top[0],top[1],bottom[0],bottom[1],'#64748b');if(i%Math.ceil(m.stations.length/12)===0||i===m.stations.length-1)T(bottom[0]-14,bottom[1]+22,fmt(s.station),11);}
  const z=xy(st0,0),q=xy(st0+len,0);L(z[0],z[1],q[0],q[1],'#0f766e',2);
  T(35,485,'총 연장 '+fmt(len)+' m / 횡단 폭 '+fmt(hi-lo)+' m / 지역 좌표 1:1',14,'#183153',true);
  T(35,515,'축 방향 = 누가거리 증가 → / 횡 방향 = 좌측 이격거리 + ↑. 지리적 북쪽과 일치한다고 가정하지 않습니다.',12);
  T(35,540,'실제 필지·곡선 선형·사면 접속은 미반영. 색상은 셀 평균 고저차의 참고 표시입니다.',12,'#64748b');
 }else{
  const pts=kind==='long'?m.stations.map(s=>{const p=s.points.find(v=>v.offset===0);return {...p,offset:s.station};}):s.points;
  const xmin=pts[0].offset,xmax=pts.at(-1).offset,zs=pts.flatMap(p=>[p.existing,p.design]),zmin=Math.floor(Math.min(...zs)*2)/2-.5,zmax=Math.ceil(Math.max(...zs)*2)/2+.5;
  const sx=930/(xmax-xmin),sy=145/(zmax-zmin),xy=p=>[80+(p.offset-xmin)*sx,245-(p.z-zmin)*sy];
  for(let i=0;i<=4;i++){const z=zmin+(zmax-zmin)*i/4,y=xy({offset:xmin,z})[1];L(80,y,1010,y,'#dbe4ee');T(10,y+4,z.toFixed(2),11);}
  for(const p of W.strips(pts)){const points=[{offset:p.p.offset,z:p.p.existing},{offset:p.q.offset,z:p.q.existing},{offset:p.q.offset,z:p.q.design},{offset:p.p.offset,z:p.p.design}].map(xy);P(points,p.cut>0?'#fecaca':'#bfdbfe','none');}
  for(const [key,color]of [['existing','#92400e'],['design','#0f766e']])P(pts.map(p=>xy({offset:p.offset,z:p[key]})),'none',color,2);
  for(let i=0;i<=5;i++){const v=xmin+(xmax-xmin)*i/5,x=xy({offset:v,z:zmin})[0];L(x,245,x,251,'#64748b');T(x-16,270,fmt(v),11);}
  T(80,86,'EL (m) / 가로 '+(kind==='long'?'누가거리':'이격거리')+' (m) / 세로 과장 '+(sy/sx).toFixed(2)+'배',11,'#64748b');
  T(80,306,kind==='long'?'중심선 현황·계획고. 토공량은 전체 횡단면을 사용합니다.':'절토면적 '+fmt(s.cut)+'㎡ / 성토면적 '+fmt(s.fill)+'㎡ / 영교차 분할 적분',13,'#183153',true);
  T(80,329,'DL '+zmin.toFixed(2)+' m · 표고값 자체는 입력 기준 유지 · 자동 축척 그림이며 출력 실측 축척도 아님',10,'#64748b');
 }
 return {width:1100,height,items:a};
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function svg(s){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+s.width+' '+s.height+'" role="img" aria-label="종횡단 및 토공 검토도">'+s.items.map(p=>{if(p.t==='r')return '<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" fill="'+p.fill+'" stroke="'+(p.stroke||'none')+'"/>';if(p.t==='l')return '<line x1="'+p.x+'" y1="'+p.y+'" x2="'+p.x2+'" y2="'+p.y2+'" stroke="'+p.stroke+'" stroke-width="'+p.width+'"/>';if(p.t==='p')return '<polyline points="'+p.points.map(v=>v.join(',')).join(' ')+'" fill="'+p.fill+'" stroke="'+p.stroke+'" stroke-width="'+p.width+'"/>';return '<text x="'+p.x+'" y="'+p.y+'" font-family="Malgun Gothic,sans-serif" font-size="'+p.size+'" fill="'+p.fill+'" font-weight="'+(p.bold?700:400)+'">'+esc(p.text)+'</text>';}).join('')+'</svg>';}
function canvas(c,s,box){const k=Math.min(box.w/s.width,box.h/s.height);c.save();c.translate(box.x,box.y);c.scale(k,k);for(const p of s.items){c.fillStyle=p.fill||'#183153';c.strokeStyle=p.stroke||'transparent';c.lineWidth=p.width||1;if(p.t==='r'){if(p.fill!=='none')c.fillRect(p.x,p.y,p.w,p.h);if(p.stroke)c.strokeRect(p.x,p.y,p.w,p.h);}else if(p.t==='t'){c.font=(p.bold?'bold ':'')+p.size+'px "Malgun Gothic",sans-serif';c.fillText(p.text,p.x,p.y);}else{c.beginPath();if(p.t==='l'){c.moveTo(p.x,p.y);c.lineTo(p.x2,p.y2);}else{p.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(p.fill!=='none'){c.closePath();c.fill();}}if(p.stroke!=='none')c.stroke();}}c.restore();}
function dxf(m){
 let out='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
 const poly=(layer,points,closed=false)=>{out+='0\nLWPOLYLINE\n100\nAcDbEntity\n8\n'+layer+'\n100\nAcDbPolyline\n90\n'+points.length+'\n70\n'+(closed?1:0)+'\n'+points.map(([x,y])=>'10\n'+x+'\n20\n'+y+'\n').join('');};
 const note=(x,y,s)=>{out+='0\nTEXT\n100\nAcDbEntity\n8\nNOTES\n100\nAcDbText\n10\n'+x+'\n20\n'+y+'\n30\n0\n40\n0.7\n1\n'+s+'\n';};
 const st0=m.stations[0].station,len=m.stations.at(-1).station-st0,lo=m.offsets[0],hi=m.offsets.at(-1),width=hi-lo,zs=m.stations.flatMap(s=>s.points.flatMap(p=>[p.existing,p.design])),datum=Math.floor(Math.min(...zs))-1,zrange=Math.max(...zs)-datum;
 poly('PLAN_BOUNDARY',[[0,lo],[len,lo],[len,hi],[0,hi]],true);poly('CENTERLINE',[[0,0],[len,0]]);
 m.stations.forEach(s=>{poly('STATIONS',[[s.station-st0,lo],[s.station-st0,hi]]);note(s.station-st0,lo-2,'STA '+s.station);});
 note(0,hi+3,'LOCAL STRAIGHT ALIGNMENT: X=CHAINAGE, Y=LEFT OFFSET. NOT GEOREFERENCED.');
 const yLong=lo-zrange-12;
 for(const key of ['existing','design'])poly(key==='existing'?'LONG_EXIST':'LONG_DESIGN',m.stations.map(s=>{const p=s.points.find(p=>p.offset===0);return [s.station-st0,yLong+p[key]-datum];}));
 note(0,yLong-3,'LONGITUDINAL / EL DATUM '+datum+' / H:V=1:1 / UNITS=m');
 m.stations.forEach((s,i)=>{const x=(i%2)*(width+15),y=yLong-15-Math.floor(i/2)*(zrange+12);
 for(const key of ['existing','design'])poly(key==='existing'?'CROSS_EXIST':'CROSS_DESIGN',s.points.map(p=>[x+p.offset-lo,y+p[key]-datum]));
 for(const p of s.pieces)poly(p.cut>0?'CUT':'FILL',[[x+p.p.offset-lo,y+p.p.existing-datum],[x+p.q.offset-lo,y+p.q.existing-datum],[x+p.q.offset-lo,y+p.q.design-datum],[x+p.p.offset-lo,y+p.p.design-datum]],true);
 note(x,y-2,'CROSS STA '+s.station+' / DATUM '+datum+' / CUT '+s.cut.toFixed(3)+' / FILL '+s.fill.toFixed(3));});
 note(0,hi+6,'INPUT-BASED REVIEW ONLY. SOURCE, FACTORS AND QUANTITIES: SEE WORKBOOK/PDF.');
 return out+'0\nENDSEC\n0\nEOF\n';
}
const api={scene,svg,canvas,dxf};if(typeof module!=='undefined')module.exports=api;else root.EarthDraw=api;
})(typeof window==='undefined'?globalThis:window);