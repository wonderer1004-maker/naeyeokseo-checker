/* Runs only in the isolated, same-origin VWorld viewer frame. */
(function(){'use strict';
 const hostOrigin=parent.location.origin,config=JSON.parse(document.getElementById('initialCenter').textContent);
 const send=(type,data={})=>parent.postMessage({channel:'fieldwork-terrain-3d',session:config.session,type,...data},hostOrigin);
 let ready=false,busy=false;
 const deadline=Date.now()+45000;
 function init(){
  try{
   if(!window.vw||!vw.Map)throw Error('3D 지도 인증 또는 로드 실패');
   const center=config.point,map=new vw.Map();
   map.setOption({mapId:'vmap',initPosition:new vw.CameraPosition(new vw.CoordZ(center[0],center[1],900),new vw.Direction(0,-65,0)),logo:true,navigation:true});map.start();
   const timer=setInterval(()=>{if(window.ws3d?.viewer?.map?.terrain?.sampleTerrainByPointArray&&window.ws3d?.common?.OgcPoint){clearInterval(timer);ready=true;send('ready');}else if(Date.now()>deadline){clearInterval(timer);send('error',{message:'3D 지형 연결 시간이 초과되었습니다. API 키의 3D 사용 권한·허용 URL과 WebGL 지원을 확인하세요.'});}},300);
  }catch(e){send('error',{message:'브이월드 3D 초기화에 실패했습니다. 키·허용 URL과 브라우저 WebGL 지원을 확인하세요.'});}
 }
 async function sample(data){
  if(!ready||busy)return;busy=true;
  const token=data.token;
  try{
   if(!Array.isArray(data.points)||data.points.length>4096||!data.points.length)throw Error('표고 조회점 범위 오류');
   if(data.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(v=>typeof v==='number'&&Number.isFinite(v))||p[0]<110||p[0]>150||p[1]<20||p[1]>50))throw Error('표고 조회 좌표 오류');
   const heights=[];
   for(let i=0;i<data.points.length;i+=128){
    const nodes=data.points.slice(i,i+128).map(p=>new ws3d.common.OgcPoint(p[0],p[1],0));let timeout;
    try{
     const result=await Promise.race([Promise.resolve(ws3d.viewer.map.terrain.sampleTerrainByPointArray(nodes)),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('지형 표고 조회 시간 초과')),30000);})]);
     if(!Array.isArray(result)||result.length!==nodes.length||result.some(v=>typeof v!=='number'||!Number.isFinite(v)||v< -500||v>9000))throw Error('브이월드 표고가 누락되었거나 유효하지 않습니다.');
     heights.push(...result);send('progress',{token,done:heights.length,total:data.points.length});
    }finally{clearTimeout(timeout);}
   }
   if(heights.every(v=>v===0))throw Error('모든 표고가 0m로 반환되어 지형 확보를 확인할 수 없습니다. 측량 자료를 사용하세요.');
   send('sampled',{token,heights,sampledAt:new Date().toISOString()});
  }catch(e){send('sampleError',{token,message:e.message||'지형 조회 실패'});}finally{busy=false;}
 }
 addEventListener('message',e=>{if(e.source!==parent||e.origin!==hostOrigin||e.data?.channel!=='fieldwork-terrain-host')return;if(e.data.type==='sample')sample(e.data);});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
