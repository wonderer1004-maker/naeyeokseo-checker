'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(withMap=true){
 const els=new Map(),scripts=[],timers=new Map();let timerId=0,removed=0;
 class El{constructor(id){this.id=id;this.value='';this.events={};this.textContent='';}addEventListener(k,f){(this.events[k]??=[]).push(f);}dispatchEvent(e){for(const f of this.events[e.type]||[])f(e);}focus(){this.focused=true;}remove(){this.removed=true;}}
 const $=id=>{if(!els.has(id))els.set(id,new El(id));return els.get(id);};
 $('latitude').value='37.5';$('mapLayer').value='topo';$('addressType').value='PARCEL';
 const map={views:[],events:{},setView(v,z){this.views.push([v,z]);return this;},on(k,f){this.events[k]=f;},removeLayer(){removed++;},invalidateSize(){}};
 const layers=[],markers=[];
 const L={map:()=>map,control:{scale:()=>({addTo(){}})},tileLayer:(url,options)=>{const l={url,options,on(){return l;},addTo(){return l;}};layers.push(l);return l;},circleMarker:p=>{const m={p,addTo(){return m;},bindTooltip(){return m;},setLatLng(v){m.p=v;}};markers.push(m);return m;}};
 const window=withMap?{L}:{};
 const ctx={document:{getElementById:$,createElement:()=>new El('script'),body:{appendChild:s=>scripts.push(s)}},window,URLSearchParams,Event:class{constructor(type){this.type=type;}},setTimeout:f=>{timers.set(++timerId,f);return timerId;},clearTimeout:id=>timers.delete(id),Date,Math};
 vm.runInNewContext(fs.readFileSync('docs/terrain-map.js','utf8'),ctx);
 return {$,window,map,layers,markers,scripts,timers,removed:()=>removed,fire:(id,type='click')=>$(id).dispatchEvent({type,preventDefault(){}}),reply:(s,p)=>{const cb=new URL(s.src).searchParams.get('callback');window[cb](p);}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const f=fixture();assert.equal(f.map.views[0][1],7);assert.equal(f.window.TerrainMap.selected,null);
 assert.equal(f.window.TerrainMap.point('',127),null);assert.equal(f.window.TerrainMap.point(90,127),null);assert.equal(f.window.TerrainMap.point(37,Infinity),null);
 f.fire('geocodeBtn');assert.match(f.$('coordResult').textContent,/주소를 입력/);
 f.$('address').value='서울특별시 중구 세종대로 110';f.fire('geocodeBtn');assert.equal(f.$('vworldSettings').open,true);assert.equal(f.scripts.length,0);
 f.$('longitude').value='126.978';f.fire('moveMapBtn');assert.equal(f.map.views.at(-1)[1],17);assert.equal(f.markers.length,1);assert.equal(f.$('latitude').value,'37.500000');
 f.map.events.click({latlng:{lat:37.5665,lng:126.978}});assert.equal(f.$('latitude').value,'37.566500');assert.equal(f.markers.length,1);
 f.$('mapLayer').value='satellite';f.fire('mapLayer','change');assert.match(f.layers.at(-1).url,/World_Imagery/);
 f.$('vworldKey').value='test-key';f.$('addressType').value='ROAD';f.fire('geocodeBtn');f.fire('geocodeBtn');assert.equal(f.scripts.length,1);
 const req=f.scripts[0],params=new URL(req.src).searchParams;assert.equal(params.get('type'),'ROAD');assert.equal(params.get('crs'),'epsg:4326');
 f.reply(req,{response:{status:'OK',result:{point:{x:'127.1',y:'36.4'}}}});await tick();assert.equal(req.removed,true);assert.equal(f.$('geocodeBtn').disabled,false);assert.equal(f.$('latitude').value,'36.400000');
 // A late lookup cannot overwrite a newer manual selection.
 f.fire('geocodeBtn');const stale=f.scripts.at(-1);f.map.events.click({latlng:{lat:35,lng:128}});f.reply(stale,{response:{status:'OK',result:{point:{x:127,y:37}}}});await tick();assert.equal(f.$('latitude').value,'35.000000');
 f.fire('geocodeBtn');f.reply(f.scripts.at(-1),{response:{status:'NOT_FOUND'}});await tick();assert.match(f.$('coordResult').textContent,/검색된 주소가 없습니다/);assert.equal(f.$('latitude').value,'35.000000');
 f.fire('geocodeBtn');for(const fn of [...f.timers.values()])fn();await tick();assert.match(f.$('coordResult').textContent,/초과/);assert.equal(f.$('geocodeBtn').disabled,false);
 f.$('longitude').value='';f.window.TerrainMap.restore();assert.equal(f.window.TerrainMap.selected,null);assert.equal(f.map.views.at(-1)[1],7);assert.ok(f.removed()>0);
 f.$('latitude').value='34.5';f.$('longitude').value='126.5';f.window.TerrainMap.restore();assert.equal(f.map.views.at(-1)[0][0],34.5);
 const offline=fixture(false);assert.match(offline.$('mapStatus').textContent,/불러오지 못했습니다/);offline.$('longitude').value='127';offline.fire('moveMapBtn');assert.equal(offline.window.TerrainMap.selected.lon,127);
 for(const name of ['terrain-map.js','terrain-map.css','jibun-estimate.html','field-evidence.js'])assert.equal(fs.readFileSync('docs/'+name,'utf8'),fs.readFileSync('netlify-site/'+name,'utf8'));
 const html=fs.readFileSync('docs/jibun-estimate.html','utf8');assert.equal((html.match(/id="latitude"/g)||[]).length,1);assert.ok(html.indexOf('terrain-map.js')<html.indexOf('field-evidence.js'));assert.match(html,/경도:document/);
 console.log('PASS: map selection, coordinate validation, ROAD/PARCEL lookup, missing key, request deduplication, stale response, timeout, restore, CDN failure and deploy parity');
})().catch(e=>{console.error(e);process.exitCode=1;});
