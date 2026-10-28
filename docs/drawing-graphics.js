(function(root){'use strict';
const Sheet=typeof EngineeringSheet!=='undefined'?EngineeringSheet:require('./engineering-sheet.js');
function legacyScene(l){const a=[],R=(x,y,w,h,fill,stroke)=>a.push({t:'rect',x,y,w,h,fill,stroke}),L=(x,y,x2,y2,stroke,width=1)=>a.push({t:'line',x,y,x2,y2,stroke,width}),T=(x,y,value,size=14,fill='#142d4e',bold=false)=>a.push({t:'text',x,y,value:String(value),size,fill,bold});
R(0,0,1040,760,'#fff','#94a3b8');R(0,0,1040,96,'#142d4e');T(30,42,'SOLAR SITE / 개념 배치 검토',24,'#fff',true);T(30,72,'수평 투영 배치 · 평탄 설치 가정 · 실제 측량 도면 아님',13,'#cbd5e1');T(760,42,l.capacityKw.toFixed(2)+' kW',27,'#fff',true);T(760,70,l.count+' MODULES / '+l.occupiedRows+' ROWS',13,'#cbd5e1');
const ox=88,oy=636,k=480/l.side;R(56,126,552,544,'#f5f8fc','#dbe4ee');
for(let i=0;i<=10;i++){const q=i*48;L(ox+q,156,ox+q,oy,'#dbe4ee',.6);L(ox,oy-q,568,oy-q,'#dbe4ee',.6);}
for(const p of l.polygons)a.push({t:'polygon',points:p.points.map(([x,y])=>[ox+x*k,oy-y*k]),fill:p.layer==='SOLAR_MODULE'?'#2563eb':'none',stroke:p.layer==='USABLE'?'#0f766e':p.layer==='SOLAR_MODULE'?'#bfdbfe':'#142d4e',width:p.layer==='SOLAR_MODULE'?.45:1.8});
L(ox,653,568,653,'#94a3b8');for(const x of [ox,568])L(x-4,657,x+4,649,'#142d4e');T(228,679,l.side.toFixed(2)+' m (가정)',13);L(70,156,70,oy,'#94a3b8');for(const y of [156,oy])L(66,y+4,74,y-4,'#142d4e');T(92,146,'북 N ↑',13,'#142d4e',true);
R(640,126,366,414,'#f8fafc','#dbe4ee');T(662,158,'LAYOUT SCHEDULE',13,'#0f766e',true);
[['설치용량',l.capacityKw.toFixed(2)+' kW'],['모듈 수량',l.count+' 장'],['배치 행수',l.occupiedRows+' 행'],['행간 순 간격',l.gap.toFixed(2)+' m'],['행 피치',l.pitch.toFixed(2)+' m'],['수평 투영 부지',(l.side*l.side).toFixed(2)+' ㎡']].forEach(([x,y],i)=>{const q=198+i*48;T(662,q,x,13,'#64748b');T(820,q,y,15,'#142d4e',true);L(662,q+15,984,q+15,'#e2e8f0');});
T(662,578,'범례 / LEGEND',13,'#0f766e',true);R(662,600,19,12,'#2563eb');T(692,611,'태양광 모듈',13);L(662,637,682,637,'#0f766e',2);T(692,642,'가용영역 (사용자 비율)',13);L(662,669,682,669,'#142d4e',2);T(692,674,'가정 부지 경계',13);
const b=10**Math.floor(Math.log10(l.side/4)),n=[1,2,5,10].find(v=>v*b>=l.side/4)||10,bar=n*b;L(88,710,88+bar*k,710,'#142d4e',3);L(88,705,88,715,'#142d4e',2);L(88+bar*k,705,88+bar*k,715,'#142d4e',2);T(88,737,'0',11);T(88+bar*k-10,737,bar.toPrecision(2)+' m',11);T(430,735,'CONCEPT ONLY · x=E / y=N · REV 02',11,'#64748b');return a;}
function paper(l){
 const s=Sheet.make({project:l.projectTitle||'태양광 부지 검토',source:l.source||'사용자 입력 면적·경사·태양 조건',title:'태양광 모듈 개념 배치 평면도',no:'EA-000',scale:'AUTO FIT'});
 for(const raw of legacyScene(l).slice(6)){const a={...raw,t:({rect:'r',line:'l',text:'t',polygon:'p'})[raw.t]};for(const key of ['x','x2'])if(key in a)a[key]=a[key]*1.05+65;for(const key of ['y','y2'])if(key in a)a[key]=a[key]*1.05-50;for(const key of ['w','h','width'])if(key in a)a[key]*=1.05;if(a.points)a.points=[...a.points,a.points[0]].map(([x,y])=>[x*1.05+65,y*1.05-50]);if(a.t==='t'){a.text=a.value;a.fill='#111';a.size*=1.05;}else{if(a.fill&&a.fill!=='none')a.fill='#fff';if(a.stroke&&a.stroke!=='none')a.stroke=a.stroke==='#dbe4ee'?'#bbb':a.stroke==='#bfdbfe'?'#777':'#222';if(a.t==='r'&&raw.fill&&raw.fill!=='none'&&raw.fill!=='#fff'&&!a.stroke)a.stroke='#222';}s.items.push(a);}
 return s;
}
function scene(l){return paper(l).items;}
function svg(l){return Sheet.svg(paper(l));}
function canvas(c,l,b){return Sheet.canvas(c,paper(l),{x:b.x,y:b.y,w:b.width,h:b.height});}
const api={scene,svg,canvas,paper};if(typeof module!=='undefined')module.exports=api;else root.DrawingGraphics=api;
})(typeof window==='undefined'?globalThis:window);
