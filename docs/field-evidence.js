/* Local-only evidence: compressed images, captions, project archive and A3 PDF. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id), photos=[];
  let busy=false;
  const status=message=>$('evidenceStatus').textContent=message;
  const inputIds=[...document.querySelectorAll('input[type=number],select')].map(el=>el.id).filter(Boolean);
  function download(bytes,name,type){const u=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
  function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('이미지를 읽을 수 없습니다.'));im.src=src;});}
  function readData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('파일 읽기 실패'));r.readAsDataURL(file);});}
  function setBusy(on){busy=on;document.querySelectorAll('[data-evidence-action]').forEach(el=>el.disabled=on);}
  function render(){
    const host=$('photoGallery');host.replaceChildren();
    photos.forEach((p,i)=>{
      const card=document.createElement('article');card.className='photo-card';
      const img=document.createElement('img');img.src=p.data;img.alt=p.name;card.append(img);
      const title=document.createElement('strong');title.textContent=(i+1)+'. '+p.name;card.append(title);
      const label=document.createElement('label');label.textContent='촬영 위치·방향·현장 검토 메모';
      const note=document.createElement('textarea');note.value=p.note;note.maxLength=600;note.setAttribute('aria-label','사진 '+(i+1)+' 검토 메모');note.oninput=()=>p.note=note.value;label.append(note);card.append(label);
      const remove=document.createElement('button');remove.type='button';remove.className='btn secondary';remove.textContent='사진 삭제';remove.onclick=()=>{if(busy)return;photos.splice(i,1);render();};card.append(remove);host.append(card);
    });
    $('photoCount').textContent=photos.length+' / 8장';
  }
  $('sitePhotos').onchange=async e=>{
    if(busy)return;setBusy(true);let errors=[];
    try{
      for(const file of e.target.files){
        if(photos.length>=8){errors.push('최대 8장까지 첨부할 수 있습니다.');break;}
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){errors.push(file.name+': JPG/PNG/WebP, 장당 10MB 이하만 지원합니다.');continue;}
        try{
          const im=await loadImage(await readData(file));
          if(im.width*im.height>60000000)throw new Error('60메가픽셀 이하 이미지를 사용하세요.');
          const scale=Math.min(1,1600/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));
          const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);
          photos.push({name:file.name.slice(0,150),note:'',data:c.toDataURL('image/jpeg',.86),width:c.width,height:c.height});
        }catch(err){errors.push(file.name+': '+err.message);}
      }
      render();status(errors.length?errors.join(' / '):'사진을 첨부했습니다. 원본은 별도로 보관하세요. 사진은 이 기기에서만 처리됩니다.');
    }finally{e.target.value='';setBusy(false);}
  };
  function snapshot(){return {format:'solar-field-project',version:2,project:$('projectTitle').value,address:$('address').value,costSource:$('costSource').value,costDate:$('costDate').value,inputs:Object.fromEntries(inputIds.map(id=>[id,$(id).value])),photos};}
  $('saveFieldProject').onclick=()=>download(JSON.stringify(snapshot()),'solar-field-project.json','application/json');
  $('loadFieldProject').onchange=async e=>{
    if(busy)return;const f=e.target.files[0];if(!f)return;setBusy(true);
    try{
      if(f.size>30*1024*1024)throw new Error('프로젝트 파일은 30MB 이하여야 합니다.');
      const p=JSON.parse(await f.text());
      if(p.format!=='solar-field-project'||![1,2].includes(p.version)||typeof p.inputs!=='object'||!p.inputs||!Array.isArray(p.photos)||p.photos.length>8)throw new Error('지원하지 않는 프로젝트 파일입니다.');
      const checked=[];
      for(const item of p.photos){
        if(typeof item.data!=='string'||item.data.length>5*1024*1024||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(item.data))throw new Error('사진 형식 오류');
        const im=await loadImage(item.data);if(im.width>1600||im.height>1600)throw new Error('사진 크기 초과');
        checked.push({data:item.data,width:im.width,height:im.height,name:String(item.name||'현장사진').slice(0,150),note:String(item.note||'').slice(0,600)});
      }
      for(const id of inputIds)if(id in p.inputs){
        const value=String(p.inputs[id]);
        if($(id).tagName==='SELECT'&&![...$(id).options].some(o=>o.value===value))throw new Error('선택 항목 오류: '+id);
        if($(id).tagName!=='SELECT'&&value!==''&&!Number.isFinite(Number(value)))throw new Error('수치 오류: '+id);
      }
      photos.splice(0,photos.length,...checked);$('projectTitle').value=String(p.project||'').slice(0,100);$('address').value=String(p.address||'').slice(0,300);
      for(const id of inputIds)if(id in p.inputs)$(id).value=String(p.inputs[id]);
      if($('longitude')&&!('longitude' in p.inputs))$('longitude').value='';
      if(window.TerrainMap)window.TerrainMap.restore();
for(const [id,value]of Object.entries({areaBasis:'horizontal',slopeUnit:'percent',siteCostBasis:'horizontal',earthworkMode:'included',c_earthwork:'0'}))if(!(id in p.inputs))$(id).value=value;
$('costSource').value=String(p.costSource||'').slice(0,160);$('costDate').value=/^\d{4}-\d{2}-\d{2}$/.test(p.costDate||'')?p.costDate:'';
      render();calculate();status('프로젝트와 사진을 불러왔습니다. 입력값과 계산 결과를 확인하세요.');
    }catch(err){status('불러오기 실패: '+err.message);}finally{e.target.value='';setBusy(false);}
  };
  function page(title,index){
    const c=document.createElement('canvas');c.width=2380;c.height=1684;const x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#183153';x.fillRect(0,0,c.width,130);
    x.fillStyle='#fff';x.font='bold 38px "Malgun Gothic", sans-serif';x.fillText(title,70,82);
    x.fillStyle='#334155';x.font='24px "Malgun Gothic", sans-serif';
    x.fillText(($('projectTitle').value||'현장 검토 프로젝트').slice(0,60),70,190);
    x.fillText(($('address').value||'주소 미입력').slice(0,90),70,232);
    x.font='20px "Malgun Gothic", sans-serif';x.fillText('개념 검토용 · 실제 필지/측량/지형 미반영 · 사진은 현장 참고자료',70,1620);
    x.fillText(new Date().toLocaleDateString('ko-KR')+' | A3 가로 | '+index+'쪽',1850,1620);
    return {c,x};
  }
  function lines(ctx,text,x,y,width,lineHeight,maxLines=20){
    let row='',n=0;for(const ch of String(text)){if(ch==='\n'||ctx.measureText(row+ch).width>width){ctx.fillText(row,x,y+n*lineHeight);row='';n++;if(n>=maxLines){ctx.fillText('…',x,y+n*lineHeight);return;}}if(ch!=='\n')row+=ch;}ctx.fillText(row,x,y+n*lineHeight);
  }
  function jpegPage(c){const data=atob(c.toDataURL('image/jpeg',.94).split(',')[1]);return {jpeg:Uint8Array.from(data,ch=>ch.charCodeAt(0)),width:c.width,height:c.height};}
  $('drawingPdfBtn').onclick=async()=>{
    if(busy||!lastRows)return;setBusy(true);status('도면과 현장사진 PDF를 만드는 중입니다…');
    try{
      const pages=[],{c,x}=page('태양광 모듈 개념 배치 평면도',1);DrawingGraphics.canvas(x,{...lastLayout,projectTitle:$('projectTitle').value||'태양광 부지 검토',source:$('address').value||'입력 면적·배치 조건'},{x:0,y:0,width:2380,height:1684});pages.push(jpegPage(c));
      const {c:tc,x:txc}=page('공사비 산출 내역 · 계산 조건',2);
      txc.fillStyle='#183153';txc.fillRect(70,272,2240,66);txc.fillStyle='#fff';
      txc.font='bold 26px "Malgun Gothic", sans-serif';txc.fillText('항목',90,315);txc.fillText('수량 / 단위',1050,315);txc.fillText('단가(원)',1500,315);txc.fillText('금액(원)',1900,315);
      lastRows.forEach((r,i)=>{const yy=390+i*75;txc.fillStyle=i%2?'#f1f5f9':'#fff';txc.fillRect(70,yy-40,2240,75);txc.fillStyle='#183153';txc.font='25px "Malgun Gothic", sans-serif';txc.fillText(r.항목,90,yy);txc.fillText(fmt(r.수량)+' '+r.단위,1050,yy);txc.fillText(fmt(r.단가),1500,yy);txc.fillText(fmt(r.금액),1900,yy);txc.font='18px Malgun Gothic';txc.fillStyle='#64748b';txc.fillText(r.산출근거.slice(0,45),90,yy+27,850);});
      txc.font='26px "Malgun Gothic", sans-serif';lines(txc,$('budgetSummary').textContent,90,980,2150,44,4);
      lines(txc,lastSnapshot.면적산정기준,90,1090,2150,38,3);
lines(txc,'토공: '+lastSnapshot.토공비+' / 수직 두께 '+lastSnapshot.평균토공깊이+'m',90,1190,2150,38,3);
      lines(txc,'제외 비용: '+lastSnapshot.제외비용,90,1290,2150,38,3);
      lines(txc,lastSnapshot.금액처리,90,1400,2150,36,3);
      lines(txc,'실제 경계·경사·장애물·계통연계는 별도 검토가 필요합니다. 실시설계 및 인허가 도면을 대체하지 않습니다.',90,1500,2150,34,2);pages.push(jpegPage(tc));
      for(let i=0;i<photos.length;i++){
        const p=photos[i],{c:pc,x:px}=page('현장사진 '+(i+1)+' · 검토 메모',pages.length+1),im=await loadImage(p.data);
        const ratio=Math.min(1480/im.width,1190/im.height);px.drawImage(im,80+(1480-im.width*ratio)/2,300+(1190-im.height*ratio)/2,im.width*ratio,im.height*ratio);
        px.font='bold 26px "Malgun Gothic", sans-serif';lines(px,p.name,1630,340,650,38,4);px.font='25px "Malgun Gothic", sans-serif';lines(px,p.note||'검토 메모 없음',1630,540,650,40,20);
        px.font='22px "Malgun Gothic", sans-serif';lines(px,'촬영 방향·축척·촬영일은 원본 자료와 대조하세요. 첨부사진은 도면 좌표와 자동 정합되지 않습니다.',1630,1420,650,34,4);pages.push(jpegPage(pc));
      }
      download(DrawingExport.pdf(pages),'solar-field-drawing.pdf','application/pdf');status('A3 가로 PDF를 다운로드했습니다. PDF 도면은 이미지 형식이며 CAD 편집은 DXF/DWG를 사용하세요.');
    }catch(err){status('PDF 생성 실패: '+err.message);}finally{setBusy(false);}
  };
  const dwg=$('dwgBtn');
  async function checkDwg(){
    if(!['localhost','127.0.0.1'].includes(location.hostname)){dwg.disabled=true;$('dwgStatus').textContent='DWG 직접 출력은 로컬 CAD 서버에서 지원합니다. GitHub Pages에서는 DXF 다운로드 후 CAD에서 DWG로 저장할 수 있습니다.';return;}
    try{const r=await fetch('/api/cad/health');const p=await r.json();if(!r.ok||!p.available)throw new Error();dwg.disabled=false;$('dwgStatus').textContent='DWG 변환기 연결됨 · AutoCAD 2000 형식 · 사진은 PDF에 첨부';}
    catch{dwg.disabled=true;$('dwgStatus').textContent='DWG 변환기를 연결하려면 README의 로컬 CAD 서버 실행 안내를 확인하세요.';}
  }
  dwg.onclick=async()=>{
    if(!lastRows||busy)return;dwg.disabled=true;setBusy(true);status('DWG 변환 중… 사진은 전송하지 않습니다.');
    try{const r=await fetch('/api/cad/dwg',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dxf:DrawingExport.dxf(lastLayout)})});if(!r.ok)throw new Error((await r.json()).error||'변환 실패');const bytes=new Uint8Array(await r.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,6))!=='AC1015')throw new Error('DWG 형식 검증 실패');download(bytes,'concept-layout.dwg','application/acad');status('실제 DWG 파일을 다운로드했습니다. 사진은 PDF에 포함되며 DWG는 배치선과 모듈 도형을 포함합니다.');}
    catch(err){status('DWG 출력 실패: '+err.message);}finally{setBusy(false);checkDwg();}
  };
  // Evidence fields must not invalidate an already calculated layout.
  $('dxfBtn').onclick=()=>{if(lastRows)download(DrawingExport.dxf(lastLayout),'concept-layout.dxf','application/dxf');};
  render();checkDwg();
})();
