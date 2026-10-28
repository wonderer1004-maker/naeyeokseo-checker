(function(){'use strict';
const sheets={
 site:{label:'부지 검토',title:'부지를 이해하고, 공사를 구체화하세요.',description:'면적·경사도·배치 조건과 현장사진을 바탕으로 사업의 시작을 정리합니다.',file:'jibun-estimate.html',key:'site'},
 earth:{label:'종횡단·토공',title:'지형의 변화에서, 정확한 토공 수량으로.',description:'현황고와 계획고를 연결해 평면·종단·횡단 도면과 토공 내역을 검토합니다.',file:'earthworks.html',key:'earth'},
 module:{label:'모듈 설치',title:'모듈 한 장부터, 전체 발전소 배치까지.',description:'배치 조건과 설치 물량을 정리하고 스트링 평면도와 공사 내역을 확인합니다.',file:'pv-works.html',key:'pv',mode:'module'},
 electric:{label:'전기공사',title:'전기의 흐름을 그리고, 자재를 산출하세요.',description:'스트링·인버터 조건에서 배선 경로와 단선 구성도, 전기 자재 수량을 검토합니다.',file:'pv-works.html',key:'pv',mode:'electric'},
 structure:{label:'구조물공사',title:'가대와 기초를, 도면과 수량으로 연결하세요.',description:'부재·지주·기초 조건을 정리해 구조물 배치도와 자재 내역을 확인합니다.',file:'pv-works.html',key:'pv',mode:'structure'},
 review:{label:'내역서 검토',title:'흩어진 내역을, 명확한 숫자로.',description:'엑셀 내역서를 불러와 공종별 금액과 수량·단가 오류를 한눈에 검토합니다.',file:'index.html',key:'review'}
};
const order=Object.keys(sheets),frames=new Map(),tabs=[...document.querySelectorAll('[data-sheet]')];let current='';
function route(){const value=location.hash.slice(1).split('/')[0];return Object.hasOwn(sheets,value)?value:'site';}
function select(id,options={}){if(!Object.hasOwn(sheets,id))return;const s=sheets[id];current=id;
 if(options.history!==false&&location.hash!=='#'+id)history.pushState(null,'','#'+id);
 document.title=s.label+' · FIELDWORK';document.getElementById('sheetTitle').textContent=s.title;document.getElementById('sheetDescription').textContent=s.description;document.getElementById('activeLabel').textContent=s.label;document.getElementById('sheetNumber').textContent=String(order.indexOf(id)+1).padStart(2,'0');
 for(const tab of tabs){const selected=tab.dataset.sheet===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
 for(const f of frames.values()){f.hidden=true;f.parentElement.hidden=true;}
 let f=frames.get(s.key);const loading=document.getElementById('loading');
 if(!f){const panel=document.createElement('section');panel.className='sheet-panel';panel.setAttribute('role','tabpanel');f=document.createElement('iframe');f.title=s.label+' 작업 화면';f.name='fieldwork-'+s.key;f.src=s.file+'?embedded=1';f.setAttribute('allow','clipboard-write');panel.append(f);document.getElementById('frameHost').append(panel);frames.set(s.key,f);f.addEventListener('load',()=>{f.dataset.ready='true';if(sheets[current].key===s.key){loading.hidden=true;f.contentWindow.WorkspaceSheet?.setMode(sheets[current].mode||'');}});}
 f.title=s.label+' 작업 화면';f.parentElement.id='panel-'+id;f.parentElement.setAttribute('aria-labelledby','tab-'+id);f.hidden=false;f.parentElement.hidden=false;loading.hidden=f.dataset.ready==='true';if(f.dataset.ready==='true')f.contentWindow.WorkspaceSheet?.setMode(s.mode||'');
 // A shared PV document keeps all three discipline sheets in the same project.
 tabs.find(t=>t.dataset.sheet===id)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
 for(const tab of tabs)tab.setAttribute('aria-controls',sheets[tab.dataset.sheet].key==='pv'&&s.key==='pv'?'panel-'+id:'panel-'+tab.dataset.sheet);
}
for(const tab of tabs){tab.addEventListener('click',()=>select(tab.dataset.sheet));tab.addEventListener('keydown',e=>{let n=order.indexOf(tab.dataset.sheet);if(e.key==='ArrowRight')n=(n+1)%order.length;else if(e.key==='ArrowLeft')n=(n+order.length-1)%order.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=order.length-1;else return;e.preventDefault();select(order[n]);tabs[n].focus();});}
window.addEventListener('popstate',()=>select(route(),{history:false}));window.addEventListener('hashchange',()=>{if(route()!==current)select(route(),{history:false});});
document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();document.getElementById('workarea').focus();});
window.addEventListener('resize',()=>tabs.find(t=>t.dataset.sheet===current)?.scrollIntoView?.({block:'nearest',inline:'nearest'}));
const dialog=document.getElementById('helpDialog');document.getElementById('help').addEventListener('click',()=>dialog.showModal());for(const id of ['closeHelp','dismissHelp'])document.getElementById(id).addEventListener('click',()=>dialog.close());
window.Workspace={select,get current(){return current;},get frameCount(){return frames.size;}};select(route(),{history:false});
})();