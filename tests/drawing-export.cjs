'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const drawing=require('../docs/drawing-export.js'),solar=require('../docs/solar-layout.js'),{createServer}=require('../cad-server.cjs');
const layout=solar.build(3000,.6,{latitude:37.5,tilt:30,azimuth:180,length:2.3,width:1.13,power:550,clearance:.8,moduleGap:.02,window:'day'});
async function main(){
  const dxf=drawing.dxf(layout);assert.equal((dxf.match(/\nLWPOLYLINE\n/g)||[]).length,326);assert.match(dxf,/\$INSUNITS\n70\n6/);
  assert.throws(()=>drawing.dxf({...layout,polygons:[{layer:'SOLAR_MODULE',points:[[NaN,1]]}]}));
  assert.throws(()=>drawing.pdf([]));
  // Binary stream length and xref offsets must count bytes, not JS characters.
  const bytes=drawing.pdf([{width:1,height:1,jpeg:Uint8Array.from([255,216,0,128,255,217])}]);
  const text=Buffer.from(bytes).toString('latin1');assert.ok(text.startsWith('%PDF-1.4'));const xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(xref,xref+4),'xref');
  const entries=text.slice(xref).split('\n').slice(3,8);entries.forEach((line,i)=>assert.equal(text.slice(Number(line.slice(0,10)),Number(line.slice(0,10))+7),(i+1)+' 0 obj'));
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;let dir;
  try{
    const post=(body,headers={})=>fetch(url+'/api/cad/dwg',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
    assert.equal((await post('{}',{'Origin':'https://untrusted.example'})).status,403);
    const blockedHost=await new Promise((resolve,reject)=>{const r=require('node:http').get(url+'/api/cad/health',{headers:{Host:'untrusted.example'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);});assert.equal(blockedHost,403);
    const health=await(await fetch(url+'/api/cad/health')).json();
    if(health.available){
      assert.equal((await post('{')).status,400);assert.equal((await post(JSON.stringify({dxf:'invalid'}))).status,400);
      const response=await post(JSON.stringify({dxf}));assert.equal(response.status,200,await response.clone().text());
      const result=Buffer.from(await response.arrayBuffer());assert.equal(result.subarray(0,6).toString(),'AC1015');
      dir=await fs.mkdtemp(path.join(os.tmpdir(),'solar-roundtrip-'));const dwg=path.join(dir,'layout.dwg'),json=path.join(dir,'layout.json');await fs.writeFile(dwg,result);
      const reader=process.env.DWGREAD_PATH||path.resolve('.tools/libredwg/dwgread.exe');await run(reader,['-O','JSON','-o',json,dwg],{windowsHide:true});
      const data=JSON.parse(await fs.readFile(json,'utf8'));const entities=data.OBJECTS.filter(o=>o.entity==='LWPOLYLINE');assert.equal(entities.length,326);
      const layerNames=data.OBJECTS.filter(o=>o.object==='LAYER').map(o=>o.name);assert.ok(layerNames.includes('SOLAR_MODULE'));assert.ok(layerNames.includes('SHEET_EA_000'));
      const exported=entities.flatMap(o=>o.points||[]);assert.ok(exported.length>0);assert.ok(entities.every(o=>o.points.length===4));
      console.log('PASS: native DWG round-trip, 326 closed geometry polylines, AC1015 signature');
    }else{console.log('SKIP: native DWG round-trip (converter not installed)');}
    for(const name of ['drawing-export.js','field-evidence.js','jibun-estimate.html'])assert.equal(await fs.readFile('docs/'+name,'utf8'),await fs.readFile('netlify-site/'+name,'utf8'));
    console.log('PASS: PDF xref, DXF geometry, invalid inputs, origin/host protection, deploy parity');
  }finally{await new Promise(r=>server.close(r));if(dir)await fs.rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
