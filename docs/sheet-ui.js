(function(){'use strict';
const file=location.pathname.split('/').pop(),pv=file==='pv-works.html',earth=file==='earthworks.html',site=file==='jibun-estimate.html';
const root=document.querySelector('.wrap'),result=document.getElementById('result');if(!root||!result)return;
document.documentElement.dataset.theme='light';
document.addEventListener('click',e=>{const link=e.target.closest('a[href]');if(!link||e.ctrlKey||e.metaKey||e.shiftKey||link.target==='_blank')return;const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;const routes={'jibun-estimate.html':'site','earthworks.html':'earth','pv-works.html':'module','index.html':'review'},id=routes[url.pathname.split('/').pop()];if(id&&window.parent!==window&&window.parent.Workspace){e.preventDefault();window.parent.Workspace.select(id);}});
if(!pv&&!earth&&!site)return;
let view='input',mode='module';const nodes=new Map(),pvDraws=new Map();
function group(el,type){if(!el)return;el.dataset.sheetView=type;if(!nodes.has(type))nodes.set(type,[]);nodes.get(type).push(el);}
for(const card of [...root.children].filter(x=>x.classList.contains('card')))group(card,'input');
for(const card of [...result.children].filter(x=>x.classList.contains('card'))){
 if(pv){const kind=['module','electric','single','structure','detail'].find(id=>card.querySelector('#'+id));if(kind){group(card,'draw');pvDraws.set(kind,card);}else if(card.querySelector('#pdf'))group(card,'export');else group(card,'quantity');}
 else if(earth){if(card.querySelector('#plan,#long,#cross'))group(card,'draw');else if(card.querySelector('#pdf'))group(card,'export');else group(card,'quantity');}
 else group(card,card.querySelector('#layout')?'draw':'quantity');
}
if(earth){const warning=document.getElementById('warnings');if(warning)group(warning,'quantity');}
if(site){const output=document.createElement('section');output.className='card';const title=document.createElement('h2');title.textContent='도면·수량·내역서 내보내기';output.append(title);for(const el of [...result.children])if(!el.classList.contains('card')&&!el.classList.contains('metrics'))output.append(el);result.append(output);group(output,'export');}
const nav=document.createElement('nav');nav.className='section-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','시트 작업 단계');
const defs=[['input','입력 조건'],['draw','도면 보기'],['quantity','수량·내역'],['export','파일 출력']],buttons=[];
for(const[id,label]of defs){const b=document.createElement('button');b.type='button';b.id='view-tab-'+id;b.textContent=label;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===view));b.tabIndex=id===view?0:-1;b.addEventListener('click',()=>setView(id));nav.append(b);buttons.push(b);
 const section=document.createElement('section');section.id='view-panel-'+id;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',b.id);b.setAttribute('aria-controls',section.id);
 // Display contents retains the original application containers and listeners.
 section.style.display='contents';root.append(section);
 for(const el of nodes.get(id)||[])section.append(el);
}
const hint=document.createElement('span');hint.className='section-hint';hint.textContent='INPUT → DRAWING → QUANTITY';nav.append(hint);root.prepend(nav);
const metrics=result.querySelector('.metrics');if(metrics)root.insertBefore(metrics,document.getElementById('view-panel-input'));
const empty=document.createElement('div');empty.className='sheet-empty';empty.setAttribute('role','status');empty.innerHTML='<span class="empty-icon" aria-hidden="true">▤</span><h2>입력 조건을 도면과 수량으로 연결하세요.</h2><p>입력값을 확인한 뒤 산출하면 이 화면에서 결과를 바로 볼 수 있습니다.</p><button type="button">현재 입력으로 산출하기</button>';root.append(empty);
const feedback=document.createElement('div');feedback.className='sheet-feedback';feedback.setAttribute('aria-live','polite');for(const id of [site?'inputError':'error','status']){const el=document.getElementById(id);if(el)feedback.append(el);}nav.after(feedback);
const action=document.getElementById(site?'calcBtn':'calculate');empty.querySelector('button').addEventListener('click',()=>action.click());
const hasResult=()=>!result.hidden&&result.style.display!=='none';
function disciplineRows(container,allowed){if(!pv||!container)return;const rows=[...container.querySelectorAll('tr')],idIndex=rows[0]?[...rows[0].children].findIndex(c=>c.textContent==='id'):-1;for(const row of rows){if(idIndex>=0&&row.children[idIndex])row.children[idIndex].classList.add('sheet-hidden');const cells=[...row.children];const head=cells.some(c=>c.tagName==='TH');const cell=cells.find(c=>['모듈','전기','구조','기초','연동토공'].includes(c.textContent.trim()));row.classList.toggle('sheet-hidden',!head&&!!cell&&!allowed.includes(cell.textContent.trim()));}}
function refresh(){const ready=hasResult();for(const[id]of defs)document.getElementById('view-panel-'+id).hidden=id!==view;document.body.dataset.sheetStage=view;for(const[id,els]of nodes)for(const el of els){const discipline=pv&&pvDraws.size&&[...pvDraws].find(([,card])=>card===el)?.[0];const wrongMode=discipline&&(mode==='module'?discipline!=='module':mode==='electric'?!['electric','single'].includes(discipline):!['structure','detail'].includes(discipline));el.classList.toggle('sheet-hidden',id!==view||(id!=='input'&&!ready)||!!wrongMode);}
 if(metrics)metrics.classList.toggle('sheet-hidden',!ready||view==='input');empty.hidden=view==='input'||ready;
 for(const b of buttons){const selected=b.id==='view-tab-'+view;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
 if(pv){const allowed=mode==='module'?['모듈']:mode==='electric'?['전기']:['구조','기초'];disciplineRows(document.getElementById('rates'),allowed);disciplineRows(document.getElementById('bill'),allowed);}
}
function setView(id){view=id;refresh();window.scrollTo({top:0,behavior:'instant'});}
buttons.forEach((b,i)=>b.addEventListener('keydown',e=>{let n=i;if(e.key==='ArrowRight')n=(i+1)%buttons.length;else if(e.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=buttons.length-1;else return;e.preventDefault();setView(defs[n][0]);buttons[n].focus();}));
function setMode(next){if(!pv)return;const previous=mode;mode=['module','electric','structure'].includes(next)?next:'module';const allowed=mode==='module'?['배치','공통']:mode==='electric'?['전기','공통']:['구조','기초','공통'];
 for(const d of document.querySelectorAll('#fields>details')){const name=d.querySelector('summary')?.textContent.replace(' 입력','');d.classList.toggle('sheet-hidden',!allowed.includes(name));if(allowed.includes(name))d.open=true;}
 const specs=mode==='module'?['moduleSpec']:mode==='electric'?['inverterSpec']:['railSpec','beamSpec','postSpec','braceSpec','concreteSpec','rebarSpec','anchorSpec','jointSpec'];
 for(const input of document.querySelectorAll('#specs input'))input.closest('label').classList.toggle('sheet-hidden',!specs.includes(input.id));
 for(const[id,kinds]of [['stringTable',['electric']],['invTable',['electric']],['rackTable',['structure']],['footTable',['structure']]]){const el=document.getElementById(id),hidden=!kinds.includes(mode);el.classList.toggle('sheet-hidden',hidden);el.previousElementSibling?.classList.toggle('sheet-hidden',hidden);}
 const detail=document.getElementById('stringTable').closest('details');detail.classList.toggle('sheet-hidden',mode==='module');detail.querySelector('summary').textContent=mode==='electric'?'스트링·인버터 상세 수량':'가대·기초 상세 수량';
 document.getElementById('moduleSpare').closest('label').classList.toggle('sheet-hidden',mode!=='module');
 document.getElementById('specs').closest('details').querySelector('summary').textContent=({module:'모듈 규격 기록',electric:'인버터 규격 기록',structure:'구조물·기초 부재 규격 기록'}[mode]);
 document.getElementById('rates').closest('details').querySelector('summary').textContent=({module:'모듈 공급·설치 단가',electric:'전기 자재·설치 단가',structure:'구조물·기초 공종별 단가'}[mode]);
 document.getElementById('dcSpec').closest('.row').classList.toggle('sheet-hidden',mode!=='electric');
 const title=document.querySelector('[data-sheet-view="input"] h2');if(title)title.textContent='프로젝트 · '+({module:'모듈 설치',electric:'전기공사',structure:'구조물공사'}[mode])+' 입력';
 const billHeading=document.getElementById('bill')?.previousElementSibling;if(billHeading)billHeading.textContent=({module:'모듈 설치',electric:'전기공사',structure:'구조물·기초공사'}[mode])+' 수량 · 내역서';
 if(previous!==mode)window.scrollTo({top:0,behavior:'instant'});refresh();
}
action.addEventListener('click',()=>setTimeout(()=>{if(hasResult()){if(view==='input')view='draw';refresh();window.scrollTo({top:0,behavior:'instant'});}else{setView('input');const error=document.getElementById(site?'inputError':'error');if(error?.textContent)error.scrollIntoView({block:'center'});}},0));
new MutationObserver(refresh).observe(result,{attributes:true,attributeFilter:['hidden','style']});
window.WorkspaceSheet={setMode,setView,get view(){return view;},get mode(){return mode;}};if(pv)setMode('module');refresh();
})();