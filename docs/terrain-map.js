/* Location basemaps. Coordinates are WGS84; no DEM or survey values are inferred. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),host=$('terrainMap');
  if(!host)return;
  let map,marker,active,busy=false,request=0;
  const layers={
    topo:{url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',maxNativeZoom:17,attribution:'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'},
    satellite:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maxNativeZoom:19,attribution:'Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics, GIS User Community'}
  };
  function point(lat,lon){
    if(String(lat).trim()===''||String(lon).trim()==='')return null;
    lat=Number(lat);lon=Number(lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=20&&lat<=50&&lon>=110&&lon<=150?{lat,lon}:null;
  }
  function status(text){$('mapStatus').textContent=text;}
  function resetSearch(){request++;busy=false;$('geocodeBtn').disabled=false;}
  function setPoint(lat,lon,source){
    const p=point(lat,lon);if(!p)throw new Error('위도 20~50°, 경도 110~150° 범위의 좌표를 입력하세요.');
    $('latitude').value=p.lat.toFixed(6);$('longitude').value=p.lon.toFixed(6);
    $('latitude').dispatchEvent(new Event('input',{bubbles:true}));
    if(map){
      map.setView([p.lat,p.lon],17);
      if(marker)marker.setLatLng([p.lat,p.lon]);
      else marker=window.L.circleMarker([p.lat,p.lon],{radius:8,color:'#fff',weight:3,fillColor:'#0f766e',fillOpacity:1}).addTo(map);
      marker.bindTooltip('선택 위치 · '+p.lat.toFixed(6)+', '+p.lon.toFixed(6));
    }
    $('coordResult').textContent=source+' · 위도 '+p.lat.toFixed(6)+' / 경도 '+p.lon.toFixed(6)+' (WGS84)';
    status(map?'선택 위치로 이동했습니다. 지형·위성 배경도를 전환해 주변 현황을 확인하세요.':'좌표를 반영했습니다. 지도 라이브러리를 불러오려면 새로고침하세요.');
    return p;
  }
  function changeLayer(){
    if(!map)return;
    if(active)map.removeLayer(active);
    const spec=layers[$('mapLayer').value]||layers.topo;
    active=window.L.tileLayer(spec.url,{maxZoom:20,maxNativeZoom:spec.maxNativeZoom,attribution:spec.attribution});
    active.on('tileerror',()=>status('일부 지도 타일을 불러오지 못했습니다. 네트워크를 확인하거나 배경도를 전환하세요.'));
    active.addTo(map);
  }
  function restore(){
    resetSearch();changeLayer();
    const p=point($('latitude').value,$('longitude').value);
    if(p)setPoint(p.lat,p.lon,'저장된 프로젝트 위치');
    else{if(marker&&map)map.removeLayer(marker);marker=null;if(map)map.setView([36.5,127.8],7);$('coordResult').textContent='';status('주소 조회, 좌표 입력 또는 지도 클릭으로 부지를 선택하세요.');}
  }
  function geocode(address,key,type){return new Promise((resolve,reject)=>{
    const callback='terrainAddress_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');
    let timer;
    function clean(){clearTimeout(timer);script.remove();delete window[callback];}
    window[callback]=res=>{clean();const r=res&&res.response;
      if(r&&r.status==='OK'&&r.result&&r.result.point){const p=point(r.result.point.y,r.result.point.x);if(p)return resolve(p);}
      reject(new Error(r&&r.status==='NOT_FOUND'?'검색된 주소가 없습니다. 지번·도로명 구분과 주소를 확인하세요.':'주소 조회에 실패했습니다. 브이월드 키와 등록 도메인을 확인하세요.'));
    };
    const params=new URLSearchParams({service:'address',request:'getcoord',version:'2.0',format:'json',address,type,key,callback,crs:'epsg:4326'});
    script.src='https://api.vworld.kr/req/address?'+params;
    script.onerror=()=>{clean();reject(new Error('주소 조회 서버에 연결하지 못했습니다. 네트워크를 확인하세요.'));};
    timer=setTimeout(()=>{clean();reject(new Error('주소 조회 시간이 초과되었습니다. 키와 허용 도메인을 확인하세요.'));},15000);
    document.body.appendChild(script);
  });}
  async function search(){
    if(busy)return;
    const address=$('address').value.trim(),key=$('vworldKey').value.trim();
    if(!address){$('coordResult').textContent='지번 또는 도로명 주소를 입력하세요.';$('address').focus();return;}
    if(!key){$('coordResult').textContent='주소 검색에는 브이월드 API 키가 필요합니다. 아래 설정을 열어 입력하세요. 지도 클릭·좌표 입력은 키 없이 사용할 수 있습니다.';$('vworldSettings').open=true;$('vworldKey').focus();return;}
    busy=true;$('geocodeBtn').disabled=true;const token=++request;
    $('coordResult').textContent='주소를 조회하고 있습니다…';
    try{const p=await geocode(address,key,$('addressType').value);if(token===request)setPoint(p.lat,p.lon,'주소 조회 위치');}
    catch(e){if(token===request)$('coordResult').textContent=e.message;}
    finally{if(token===request){busy=false;$('geocodeBtn').disabled=false;}}
  }
  $('geocodeBtn').addEventListener('click',search);
  $('address').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search();}});
  for(const id of ['address','addressType','vworldKey'])$(id).addEventListener('input',resetSearch);
  $('moveMapBtn').addEventListener('click',()=>{resetSearch();try{setPoint($('latitude').value,$('longitude').value,'입력 좌표');}catch(e){status(e.message);}});
  for(const id of ['latitude','longitude'])$(id).addEventListener('change',()=>{resetSearch();const p=point($('latitude').value,$('longitude').value);if(p)setPoint(p.lat,p.lon,'입력 좌표');else{if(marker&&map)map.removeLayer(marker);marker=null;$('coordResult').textContent='';status('위도·경도를 모두 올바르게 입력하세요.');}});
  $('mapLayer').addEventListener('change',changeLayer);
  window.TerrainMap={point,restore,get selected(){return point($('latitude').value,$('longitude').value);}};
  if(!window.L){status('지도 기능을 불러오지 못했습니다. 네트워크 확인 후 새로고침하세요. 주소 조회와 좌표 입력은 사용할 수 있습니다.');return;}
  map=window.L.map(host,{scrollWheelZoom:false}).setView([36.5,127.8],7);
  window.L.control.scale({imperial:false}).addTo(map);changeLayer();
  map.on('click',e=>{resetSearch();try{setPoint(e.latlng.lat,e.latlng.lng,'지도에서 선택한 위치');}catch(err){status(err.message);}});
  if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(host);
  status('지도에서 부지를 클릭하거나 주소를 조회하세요. 확대·축소는 지도 왼쪽 버튼을 사용하세요.');
})();
