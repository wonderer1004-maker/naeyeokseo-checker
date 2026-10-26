/* Loopback-only optional DWG converter. No uploads leave this computer. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');const run=promisify(execFile);
const root=path.join(__dirname,'docs');
const converter=process.env.DXF2DWG_PATH||path.join(__dirname,'.tools','libredwg',process.platform==='win32'?'dxf2dwg.exe':'dxf2dwg');
function createServer(){let active=0;return http.createServer(async(req,res)=>{
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  // Reject DNS rebinding and cross-site requests to a loopback converter.
  const allowedHosts=new Set(['127.0.0.1','localhost']);const host=req.headers.host||'';
  let origin;try{origin=new URL('http://'+host);}catch{return json(403,{error:'잘못된 호스트'});}
  if(!allowedHosts.has(origin.hostname))return json(403,{error:'로컬 접속만 허용됩니다.'});
  if(req.headers.origin&&req.headers.origin!==origin.origin)return json(403,{error:'다른 출처의 요청은 허용되지 않습니다.'});
  const url=new URL(req.url,origin);
  if(url.pathname==='/api/cad/health'&&req.method==='GET')return json(200,{available:fs.existsSync(converter)});
  if(url.pathname==='/api/cad/dwg'&&req.method==='POST'){
    if(!fs.existsSync(converter))return json(503,{error:'DXF2DWG_PATH에 변환기를 설정하세요.'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(415,{error:'JSON 요청만 지원합니다.'});
    if(active>=2)return json(429,{error:'변환 중입니다. 잠시 후 다시 시도하세요.'});
    let dir;active++;
    try{
      const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>8*1024*1024){json(413,{error:'도면 크기 초과'});return;}chunks.push(chunk);}
      const p=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(typeof p.dxf!=='string'||!p.dxf.startsWith('0\nSECTION\n')||!p.dxf.endsWith('0\nEOF\n'))return json(400,{error:'유효한 DXF가 아닙니다.'});
      dir=await fsp.mkdtemp(path.join(os.tmpdir(),'solar-cad-'));const input=path.join(dir,'layout.dxf'),output=path.join(dir,'layout.dwg');
      await fsp.writeFile(input,p.dxf,'utf8');
      await run(converter,['--as','r2000','-o',output,input],{cwd:dir,timeout:30000,maxBuffer:1024*1024,windowsHide:true});
      const dwg=await fsp.readFile(output);if(dwg.subarray(0,6).toString()!=='AC1015')throw new Error('DWG signature');
      res.writeHead(200,{'Content-Type':'application/acad','Content-Disposition':'attachment; filename="concept-layout.dwg"','Cache-Control':'no-store'});res.end(dwg);
    }catch(err){json(err instanceof SyntaxError?400:500,{error:err instanceof SyntaxError?'JSON 형식 오류':'DWG 변환에 실패했습니다. 변환기 설치와 도면을 확인하세요.'});}
    finally{active--;if(dir)await fsp.rm(dir,{recursive:true,force:true});}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'지원하지 않는 요청'});
  if(url.pathname.startsWith('/api/'))return json(404,{error:'없는 API'});
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/jibun-estimate.html':url.pathname));}catch{return json(400,{error:'경로 오류'});}
  if(!file.startsWith(root+path.sep))return json(403,{error:'접근할 수 없는 경로'});
  try{const data=await fsp.readFile(file);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{json(404,{error:'파일 없음'});}
});}
if(require.main===module){const port=Number(process.env.PORT||8787);createServer().listen(port,'127.0.0.1',()=>console.log('현장 검토 앱: http://127.0.0.1:'+port+'/jibun-estimate.html'));}
module.exports={createServer};
