/* Offline integration test of the real report renderer, using native canvas. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image}=require('@napi-rs/canvas');
const html=fs.readFileSync('docs/jibun-estimate.html','utf8'),elements={},downloads=[];
function el(id,extra={}){return elements[id]??=(Object.assign({id,value:'',textContent:'',innerHTML:'',style:{},disabled:false,tagName:'INPUT',children:[],addEventListener(){},closest(){return null;},setAttribute(){},append(...c){this.children.push(...c);},replaceChildren(){this.children=[];},click(){},selectedOptions:[{text:'계획관리지역 (예시)'}],classList:{contains(c){return c==='irradiance'&&id.startsWith('irr');}}},extra));}
for(const tag of html.matchAll(/<input\b[^>]*>/g)){const id=tag[0].match(/id="([^"]+)"/)?.[1];if(id)el(id,{type:tag[0].match(/type="([^"]+)"/)?.[1],value:tag[0].match(/value="([^"]*)"/)?.[1]||''});}
for(const [id,value] of Object.entries({landuse:'1.0',shadowWindow:'day',areaBasis:'horizontal',slopeUnit:'percent',siteCostBasis:'horizontal',earthworkMode:'included'}))el(id,{tagName:'SELECT',value,options:[{value}]});
const document={getElementById:el,querySelectorAll(selector){if(selector.startsWith('input'))return Object.values(elements).filter(e=>(selector==='input,select')||(e.type==='number')||(selector.includes('select')&&e.tagName==='SELECT'));return [];},createElement(tag){return tag==='canvas'?createCanvas(1,1):el('generated-'+Object.keys(elements).length,{tagName:tag.toUpperCase()});}};
const URLMock=class extends URL{};URLMock.createObjectURL=b=>{downloads.push(b);return 'blob:test';};URLMock.revokeObjectURL=()=>{};
const c=vm.createContext({document,Image,TextEncoder,Uint8Array,Blob,URL:URLMock,URLSearchParams,console,localStorage:{removeItem(){}},location:{hostname:'example.github.io'},setTimeout,clearTimeout,atob,alert(){}});
vm.runInContext('window=globalThis',c);for(const file of ['estimate-core.js','drawing-graphics.js','solar-layout.js','drawing-export.js'])vm.runInContext(fs.readFileSync('docs/'+file,'utf8'),c);
vm.runInContext(html.split('<script>')[1].split('</script>')[0],c);vm.runInContext(fs.readFileSync('docs/field-evidence.js','utf8'),c);
async function main(){
  const sample=createCanvas(1200,800),s=sample.getContext('2d');s.fillStyle='#dbe8d0';s.fillRect(0,0,1200,800);s.fillStyle='#b2a18a';s.fillRect(140,160,860,470);s.fillStyle='#334155';s.fillRect(0,650,1200,110);s.font='24px "Malgun Gothic"';s.fillText('합성 테스트 이미지 / 실제 현장 사진 아님',50,80);
  const project={format:'solar-field-project',version:1,project:'태양광 현장 검토 샘플',address:'테스트 부지 (실제 주소 아님)',inputs:{area:'3000'},photos:[{name:'현장 참고 이미지.jpg',note:'합성 테스트 이미지입니다. 실제 드론 촬영이나 측량 자료가 아닙니다. 진입로·배수·주변 장애물은 현장 확인이 필요합니다.',data:sample.toDataURL('image/jpeg')}]};
  await el('loadFieldProject').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify(project)}],value:'test'}});
  assert.equal(el('photoCount').textContent,'1 / 8장');assert.match(el('evidenceStatus').textContent,/불러왔습니다/);assert.equal(vm.runInContext('lastLayout.count',c),324);
  await el('drawingPdfBtn').onclick();assert.match(el('evidenceStatus').textContent,/다운로드했습니다/);assert.equal(downloads.length,1);
  fs.mkdirSync('output/pdf',{recursive:true});fs.writeFileSync('output/pdf/solar-field-drawing-sample.pdf',Buffer.from(await downloads[0].arrayBuffer()));
  el('saveFieldProject').onclick();const archive=JSON.parse(await downloads[1].text());assert.equal(archive.photos.length,1);assert.equal(archive.photos[0].note,project.photos[0].note);assert.ok(!('vworldKey' in archive.inputs));
  const bad={...project,photos:[{data:'data:image/svg+xml,<svg onload="alert(1)"/>'}]};
  await el('loadFieldProject').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify(bad)}],value:'test'}});assert.match(el('evidenceStatus').textContent,/실패/);assert.equal(el('photoCount').textContent,'1 / 8장');
  console.log('PASS: photo project restore/archive, real A3 PDF rendering, photo memo, key exclusion, unsafe image rejection');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
