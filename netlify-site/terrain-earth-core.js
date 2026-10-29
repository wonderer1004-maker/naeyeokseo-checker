(function(root){'use strict';
const R=6378137,rad=Math.PI/180,EPS=1e-8;
function num(v,label){if(typeof v!=='number'||!Number.isFinite(v))throw Error(label+' 수치 오류');return v;}
function area(p){return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function intersect(a,b,c,d){const o=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];const on=(a,b,p)=>Math.abs(cross(a,b,p))<EPS&&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS;return (o[0]*o[1]<0&&o[2]*o[3]<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
function boundary(coords){
 if(!Array.isArray(coords)||coords.length<3||coords.length>40)throw Error('경계는 3~40개 꼭짓점으로 지정하세요.');
 coords=coords.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('경계 좌표 형식 오류');const lon=num(p[0],'경도'),lat=num(p[1],'위도');if(lon<110||lon>150||lat<20||lat>50)throw Error('국내 부근 WGS84 좌표를 지정하세요.');return [lon,lat];});
 if(coords.length>3&&coords[0].every((n,i)=>n===coords.at(-1)[i]))coords.pop();
 const origin=[coords.reduce((s,p)=>s+p[0],0)/coords.length,coords.reduce((s,p)=>s+p[1],0)/coords.length],cos=Math.cos(origin[1]*rad);
 const toXY=p=>[(p[0]-origin[0])*rad*R*cos,(p[1]-origin[1])*rad*R],toLL=p=>[origin[0]+p[0]/(rad*R*cos),origin[1]+p[1]/(rad*R)];
 let polygon=coords.map(toXY);for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.05)throw Error('중복되거나 너무 가까운 경계 꼭짓점입니다.');if(Math.abs(cross(polygon[(i+polygon.length-1)%polygon.length],a,b))<EPS)throw Error('일직선에 중복된 꼭짓점을 제거하세요.');for(let j=i+1;j<polygon.length;j++){if(j===i+1||(i===0&&j===polygon.length-1))continue;if(intersect(a,b,polygon[j],polygon[(j+1)%polygon.length]))throw Error('경계 선이 교차하거나 겹칩니다.');}}
 const a=Math.abs(area(polygon));if(a<1||a>100000)throw Error('분석 면적은 1~100,000㎡로 지정하세요.');if(area(polygon)<0)polygon.reverse();
 const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),bounds={xmin:Math.min(...xs),xmax:Math.max(...xs),ymin:Math.min(...ys),ymax:Math.max(...ys)};
 if(bounds.xmax-bounds.xmin>2000||bounds.ymax-bounds.ymin>2000)throw Error('부지 가로·세로는 각각 2km 이하로 지정하세요.');
 return {coords,polygon,origin,bounds,area:a,toXY,toLL};
}
function ears(poly){const ids=poly.map((_,i)=>i),out=[];let guard=0;while(ids.length>3){let found=false;for(let i=0;i<ids.length;i++){const a=poly[ids[(i+ids.length-1)%ids.length]],b=poly[ids[i]],c=poly[ids[(i+1)%ids.length]];if(cross(a,b,c)<=EPS)continue;if(ids.some(j=>poly[j]!==a&&poly[j]!==b&&poly[j]!==c&&cross(a,b,poly[j])>=-EPS&&cross(b,c,poly[j])>=-EPS&&cross(c,a,poly[j])>=-EPS))continue;out.push([a,b,c]);ids.splice(i,1);found=true;break;}if(!found||guard++>50)throw Error('경계 삼각분할 실패: 경계를 단순하게 지정하세요.');}out.push(ids.map(i=>poly[i]));return out;}
function mix(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
function clip(poly,fn){const out=[];if(!poly.length)return out;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=fn(a),db=fn(b),ia=da>=-EPS,ib=db>=-EPS;if(ia)out.push(a);if(ia!==ib)out.push(mix(a,b,da/(da-db)));}return out;}
function convex(poly,tri){for(let i=0;i<3;i++)poly=clip(poly,p=>cross(tri[i],tri[(i+1)%3],p));return poly;}
function volume(poly){let v=0;for(let i=1;i<poly.length-1;i++)v+=Math.abs(cross(poly[0],poly[i],poly[i+1]))/2*(poly[0][3]+poly[i][3]+poly[i+1][3])/3;return v;}
function grid(coords,spacing=10){
 const b=boundary(coords);num(spacing,'격자 간격');if(spacing<2||spacing>50)throw Error('격자 간격은 2~50m로 지정하세요.');
 const q=b.bounds,nx=Math.max(1,Math.ceil((q.xmax-q.xmin)/spacing)),ny=Math.max(1,Math.ceil((q.ymax-q.ymin)/spacing));if(nx>80||ny>80||(nx+1)*(ny+1)>4096)throw Error('조회점 4,096개 또는 한 방향 80칸 초과: 격자 간격을 늘리세요.');
 const dx=(q.xmax-q.xmin)/nx,dy=(q.ymax-q.ymin)/ny,points=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const x=q.xmin+i*dx,y=q.ymin+j*dy,[lon,lat]=b.toLL([x,y]);points.push({x,y,lon,lat});}
 return {...b,spacing,nx,ny,dx,dy,points};
}
function calculate(g,heights,plan){
 if(!Array.isArray(heights)||heights.length!==g.points.length)throw Error('표고점이 누락되었습니다. 전체 지형을 다시 조회하세요.');
 heights.forEach(v=>{num(v,'표고');if(v< -500||v>9000)throw Error('표고 범위를 확인하세요.');});
 for(const k of ['elevation','slopeX','slopeY'])num(plan[k],k);if(Math.abs(plan.elevation)>9000||Math.abs(plan.slopeX)>50||Math.abs(plan.slopeY)>50)throw Error('계획고 ±9,000m, 동·북 경사 ±50% 범위입니다.');
 const at=(i,j)=>{const n=j*(g.nx+1)+i,p=g.points[n],z=heights[n],design=plan.elevation+p.x*plan.slopeX/100+p.y*plan.slopeY/100;return [p.x,p.y,z,z-design];};
 const boundaryTriangles=ears(g.polygon),pieces=[],cells=[];let cut=0,fill=0,totalArea=0;
 for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),d=at(i,j+1);let ca=0,cc=0,cf=0;
  for(const t of [[a,b,c],[a,c,d]])for(const ear of boundaryTriangles){const poly=convex(t,ear),ar=Math.abs(area(poly));if(poly.length<3||ar<1e-9)continue;const cv=volume(clip(poly,p=>p[3])),fv=-volume(clip(poly,p=>-p[3]));ca+=ar;cc+=Math.max(0,cv);cf+=Math.max(0,fv);pieces.push({points:poly,cut:Math.max(0,cv),fill:Math.max(0,fv)});}
  if(ca>1e-9){cells.push({열:i+1,행:j+1,수평면적:ca,절토량:cc,성토량:cf});cut+=cc;fill+=cf;totalArea+=ca;}
 }
 if(Math.abs(totalArea-g.area)>Math.max(.001,g.area*1e-7))throw Error('경계 면적 검증에 실패했습니다.');
 return {grid:g,heights,plan:{...plan},pieces,cells,area:totalArea,cut,fill,min:Math.min(...heights),max:Math.max(...heights)};
}
function transect(m,axis,value){const c=axis==='x'?0:1,k=1-c,segments=[];for(const poly of m.pieces.map(p=>p.points)){const hits=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[c]-value,db=b[c]-value;if(Math.abs(da)<EPS)hits.push(a);if(da*db<0)hits.push(mix(a,b,da/(da-db)));}hits.sort((a,b)=>a[k]-b[k]);if(hits.length>=2&&hits.at(-1)[k]-hits[0][k]>EPS)segments.push([hits[0],hits.at(-1)]);}return segments;}
const api={boundary,grid,calculate,transect,area,ears};if(typeof module!=='undefined')module.exports=api;else root.TerrainEarthCore=api;
})(typeof window==='undefined'?globalThis:window);
