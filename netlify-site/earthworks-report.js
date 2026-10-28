(function(root){'use strict';
const G=typeof EarthDraw!=='undefined'?EarthDraw:require('./earthworks-draw.js'),F=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:3});
function wrap(c,text,x,y,width,height,max=3){let line='',n=0;for(const ch of String(text)){if(c.measureText(line+ch).width>width||ch==='\n'){c.fillText(line,x,y+n*height);n++;line='';if(n>=max){c.fillText('…',x,y+n*height);return;}}if(ch!=='\n')line+=ch;}c.fillText(line,x,y+n*height);}
function pages(m,makeCanvas){
 const out=[];function page(title){const c=makeCanvas(2380,1684),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,2380,1684);x.fillStyle='#183153';x.fillRect(0,0,2380,145);x.fillStyle='#fff';x.font='bold 42px "Malgun Gothic",sans-serif';x.fillText(title,80,86);x.fillStyle='#183153';x.font='bold 27px "Malgun Gothic",sans-serif';x.fillText(m.title.slice(0,75),80,198);x.font='23px "Malgun Gothic",sans-serif';wrap(x,'자료: '+m.source+' / 측량 기준일: '+m.surveyDate,80,243,2210,30,2);x.font='20px "Malgun Gothic",sans-serif';x.fillStyle='#64748b';x.fillText('입력 측점 기반 근사 검토 · 실측/설계 성과를 대신하지 않음 · '+(out.length+1)+'쪽',80,1633);return {c,x};}
 function save(c){const raw=atob(c.toDataURL('image/jpeg',.94).split(',')[1]);out.push({width:c.width,height:c.height,jpeg:Uint8Array.from(raw,ch=>ch.charCodeAt(0))});}
 function drawing(kind,index=0){const c=makeCanvas(2380,1684);G.canvas(c.getContext('2d'),G.scene(kind,m,index),{x:0,y:0,w:2380,h:1684});save(c);}
 drawing('plan');drawing('long');for(let i=0;i<m.stations.length;i++)drawing('cross',i);let p;
 for(let start=0;start<m.intervals.length;start+=20){
  p=page('토공 수량산출서 · 구간별 평균단면법');const c=p.x,cols=[90,390,720,1040,1380,1730,2030],heads=['시작→끝 STA','거리(m)','시작 절토㎡','끝 절토㎡','절토량㎥','성토량㎥','누적 절토㎥'];
  c.fillStyle='#183153';c.fillRect(70,300,2240,64);c.fillStyle='#fff';c.font='bold 22px "Malgun Gothic",sans-serif';heads.forEach((v,i)=>c.fillText(v,cols[i],342));
  let cumulative=m.intervals.slice(0,start).reduce((s,r)=>s+r.절토량,0);
  m.intervals.slice(start,start+20).forEach((r,i)=>{const y=415+i*47;c.fillStyle=i%2?'#eef3f8':'#fff';c.fillRect(70,y-33,2240,47);c.fillStyle='#183153';c.font='22px "Malgun Gothic",sans-serif';cumulative+=r.절토량;[F(r.시작측점)+' → '+F(r.끝측점),F(r.거리),F(r.시작절토면적),F(r.끝절토면적),F(r.절토량),F(r.성토량),F(cumulative)].forEach((v,j)=>c.fillText(v,cols[j],y));});
  c.font='bold 28px "Malgun Gothic",sans-serif';c.fillText('총 절토 '+F(m.cut)+'㎥ (자연상태) / 총 성토 '+F(m.fill)+'㎥ (다짐상태)',90,1430);
  c.font='23px "Malgun Gothic",sans-serif';wrap(c,'산식: 거리 × (시작 단면적+끝 단면적)/2. 절토·성토를 따로 산정하며 영교차를 분할합니다. 단면적은 내부 정밀도, 구간 체적은 0.001㎥ 반올림 후 합산합니다. 성토 시작·끝 면적과 단면별 적분 근거는 엑셀에 포함됩니다.',90,1500,2160,32,3);save(p.c);
 }
 p=page('토공 내역서 · 토량환산 · 공사비');const c=p.x;c.fillStyle='#183153';c.fillRect(70,306,2240,60);c.fillStyle='#fff';c.font='bold 25px "Malgun Gothic",sans-serif';[['항목',90],['수량(㎥)',1150],['단가(원)',1540],['금액(원)',1920]].forEach(([v,x])=>c.fillText(v,x,346));
 m.costs.forEach((r,i)=>{const y=425+i*100;c.fillStyle=i%2?'#eef3f8':'#fff';c.fillRect(70,y-40,2240,100);c.fillStyle='#183153';c.font='27px "Malgun Gothic",sans-serif';c.fillText(r.항목,90,y);c.fillText(F(r.수량),1150,y);c.fillText(F(r.단가),1540,y);c.fillText(F(r.금액),1920,y);c.font='20px "Malgun Gothic",sans-serif';c.fillText(r.산출근거,90,y+35);});
 c.fillStyle='#183153';c.font='bold 28px "Malgun Gothic",sans-serif';c.fillText('직접 '+F(m.budget.direct)+'원 + 예비비 '+F(m.budget.contingency)+'원 + 부가세 '+F(m.budget.vat)+'원 = '+F(m.budget.total)+'원',90,895);
 c.font='23px "Malgun Gothic",sans-serif';wrap(c,'단가 출처: '+m.costSource,90,965,2160,32,2);
 const b=m.balance,labels=['절토자연량','성토다짐량','성토필요자연량','재사용자연량','반출자연량','반출느슨한량','부족토자연량'];c.font='24px "Malgun Gothic",sans-serif';labels.forEach((k,i)=>c.fillText(k+'  '+F(b[k])+' ㎥',90,1070+i*60));c.fillText('L='+b.L+' / C='+b.C+' / 재사용 가능률 '+b.재사용가능률+'%',90,1510);
 c.font='22px "Malgun Gothic",sans-serif';m.warnings.forEach((v,i)=>wrap(c,v,1220,1070+i*94,1040,30,2));save(p.c);return out;
}
const api={pages};if(typeof module!=='undefined')module.exports=api;else root.EarthReport=api;
})(typeof window==='undefined'?globalThis:window);