/* Flat-ground concept geometry. Coordinates: x east, y north; azimuth clockwise from true north. */
const SolarLayout = (() => {
 const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
 function sun(latitude,declination,hour=12) {
  const p=rad(latitude),d=rad(declination),h=rad((hour-12)*15);
  const x=-Math.cos(d)*Math.sin(h), y=Math.cos(p)*Math.sin(d)-Math.sin(p)*Math.cos(d)*Math.cos(h), z=Math.sin(p)*Math.sin(d)+Math.cos(p)*Math.cos(d)*Math.cos(h);
  return {x,y,z,elevation:deg(Math.asin(Math.max(-1,Math.min(1,z))))};
 }
 function seasons(o) {
  return [['봄 (춘분)',0,92],['여름 (하지)',23.44,92],['가을 (추분)',0,91],['겨울 (동지)',-23.44,90]].map(([name,d,days],i)=>{
   const s=sun(o.latitude,d), b=rad(o.tilt),a=rad(o.azimuth);
   const incidence=Math.max(0,s.x*Math.sin(b)*Math.sin(a)+s.y*Math.sin(b)*Math.cos(a)+s.z*Math.cos(b));
   const c=Math.max(-1,Math.min(1,-Math.tan(rad(o.latitude))*Math.tan(rad(d))));
   return {계절:name,남중고도:s.elevation,이론낮길이:2*deg(Math.acos(c))/15,남중직달입사계수:incidence,일수:days,일사량:o.irradiance?.[i]??null};
  });
 }
 function build(area,ratio,o) {
  const checks=[area,ratio,o.latitude,o.tilt,o.azimuth,o.length,o.width,o.power,o.clearance,o.moduleGap];
  if(checks.some(n=>!Number.isFinite(n))||area<=0||ratio<=0||ratio>1||o.latitude<20||o.latitude>50||o.tilt<0||o.tilt>60||o.azimuth<90||o.azimuth>270||o.length<=0||o.width<=0||o.power<=0||o.clearance<0||o.moduleGap<0)throw new Error('위도 20~50°, 경사각 0~60°, 방위각 90~270° 범위와 모듈 크기·출력을 확인하세요.');
  const side=Math.sqrt(area), inner=side*Math.sqrt(ratio), inset=(side-inner)/2;
  const b=rad(o.tilt),a=rad(o.azimuth),height=o.length*Math.sin(b),footprint=o.length*Math.cos(b);
  let shadow=0;
  const start=o.window==='noon'?12:9,end=o.window==='noon'?12:15;
  for(let hour=start;hour<=end+1e-8;hour+=.05){const s=sun(o.latitude,-23.44,hour);if(s.z<=0)throw new Error('선택한 시간대에 태양이 지평선 아래에 있습니다.');shadow=Math.max(shadow,height*Math.max(0,s.x*Math.sin(a)+s.y*Math.cos(a))/s.z);}
  const gap=Math.max(shadow,o.clearance),pitch=footprint+gap;
  const rotate=(x,y)=>[side/2+x*Math.cos(a)-y*Math.sin(a),side/2-x*Math.sin(a)-y*Math.cos(a)];
  const polygons=[{layer:'PARCEL',points:[[0,0],[side,0],[side,side],[0,side]]},{layer:'USABLE',points:[[inset,inset],[side-inset,inset],[side-inset,side-inset],[inset,side-inset]]}];
  const cols=Math.floor((inner+o.moduleGap)/(o.width+o.moduleGap)), rows=Math.floor((inner-footprint)/pitch)+1;
  if(cols*Math.max(rows,0)>20000)throw new Error('배치가 20,000개를 초과합니다. 부지 또는 모듈 크기를 조정하세요.');
  let count=0, occupiedRows=0;
  const spanX=cols*o.width+Math.max(0,cols-1)*o.moduleGap,spanY=Math.max(0,rows-1)*pitch+footprint;
  for(let r=0;r<rows;r++){let rc=0;for(let c=0;c<cols;c++){
   const x=-spanX/2+c*(o.width+o.moduleGap),y=-spanY/2+r*pitch;
   const points=[[x,y],[x+o.width,y],[x+o.width,y+footprint],[x,y+footprint]].map(([u,v])=>rotate(u,v));
   if(points.every(([u,v])=>u>=inset-1e-8&&u<=side-inset+1e-8&&v>=inset-1e-8&&v<=side-inset+1e-8)){polygons.push({layer:'SOLAR_MODULE',points});count++;rc++;}
  }if(rc)occupiedRows++;}
  const result={polygons,count,occupiedRows,capacityKw:count*o.power/1000,height,footprint,shadow,gap,pitch,side,seasons:seasons(o)};
  const graphics=typeof DrawingGraphics!=='undefined'?DrawingGraphics:require('./drawing-graphics.js');
  result.svg=graphics.svg(result);return result;
 }
 return {sun,seasons,build};
})();
if(typeof module!=='undefined')module.exports=SolarLayout;
