(function(root){'use strict';
const E=typeof module!=='undefined'?require('./estimate-core.js'):root.EstimateCore;
const norm=v=>String(v??'').replace(/\s/g,'').toUpperCase(),text=v=>String(v??'').trim(),has=v=>v!==null&&v!==undefined&&text(v)!=='';
function number(v){try{return E.parseNumber(v);}catch{return null;}}
const aliases={품명:'품명',명칭:'품명',항목:'품명',규격:'규격',단위:'단위',수량:'수량',설계수량:'수량',공종:'공종',단가:'합계단가',합계단가:'합계단가',금액:'금액',재료비단가:'재료비단가',노무비단가:'노무비단가',경비단가:'경비단가'};
function matrix(a,name,X,sheet){
 const h=a.findIndex((r,i)=>i<80&&r.some(v=>norm(v)==='COMPUTATION'));if(h<0)return null;
 const comp=a[h].findIndex(v=>norm(v)==='COMPUTATION'),unit=a.findIndex((r,i)=>i>h&&i<h+7&&r.slice(0,comp+1).some(v=>norm(v)==='단위'));if(unit<0)throw Error('수량산출서의 단위 행을 찾지 못했습니다.');
 const total=a.findIndex((r,i)=>i>h&&i<unit&&r.some(v=>norm(v).includes('수량산출집계')));
 const cols=[];for(let c=comp+1;c<a[h].length;c++)if(has(a[h][c])&&has(a[unit][c]))cols.push({c,name:text(a[h][c]).replace(/\s+/g,' '),spec:text(a[h+1]?.[c]),unit:text(a[unit][c])});
 if(!cols.length)throw Error('수량산출서에 자재명과 단위가 있는 열이 없습니다.');
 let group=name,from='';const rows=[],excluded=[];
 for(let i=unit+1;i<a.length;i++){const r=a[i]||[];if(!r.some(has))continue;
  if(r.slice(0,comp+1).some(v=>/^(합계|소계|총계|수량산출집계)$/.test(norm(v)))){excluded.push({원본행:i+1,제외사유:'집계행 중복 합산 방지'});continue;}
  const values=cols.filter(x=>has(r[x.c]));if(!values.length){const label=r.slice(0,comp).filter(has).map(text).join(' / ');if(label){group=label;from='';}continue;}
  const meaningful=r.slice(0,comp+1).some(has)||values.some(x=>number(r[x.c])!==0);if(!meaningful)continue;
  const fromIndex=a[h].findIndex(v=>norm(v)==='FROM'),toIndex=a[h].findIndex(v=>norm(v)==='TO');
  if(fromIndex>=0&&has(r[fromIndex]))from=text(r[fromIndex]);
  for(const col of values){const q=number(r[col.c]);if(rows.length>=50000)throw Error('펼친 상세 수량이 50,000행을 초과합니다.');rows.push({원본행:i+1,원본셀:X.utils.encode_cell({r:i,c:col.c}),공종:group,FROM:from,TO:toIndex>=0?text(r[toIndex]):'',품명:col.name,규격:col.spec,단위:col.unit,수량:q,산출근거:text(r[comp]),검토사유:q===null?'수량 형식 오류':q<0?'음수 수량: 감액 확인':'',오류여부:q===null||q<0,_column:col.c});}
 }
 const summary=cols.map(col=>{const own=rows.filter(r=>r._column===col.c),invalid=own.filter(r=>r.수량===null).length,sum=own.reduce((s,r)=>s+(r.수량??0),0),expected=total>=0?number(a[total]?.[col.c]):null,diff=invalid||expected===null?null:sum-expected;return {품명:col.name,규격:col.spec,단위:col.unit,원본집계셀:total>=0?X.utils.encode_cell({r:total,c:col.c}):'',원본집계수식:total>=0?(sheet[X.utils.encode_cell({r:total,c:col.c})]?.f||''):'',원본집계수량:expected,상세합계:invalid?null:sum,차이:diff===null?null:Math.round(diff*1e6)/1e6,검토상태:invalid?'상세 수량 오류':expected===null?'원본 집계 없음':Math.abs(diff)<1e-6?'일치':/ROUND|TRUNC|INT\(/i.test(sheet[X.utils.encode_cell({r:total,c:col.c})]?.f||'')?'원본 반올림·절사식 확인':'집계 차이'};});
 for(const r of rows)delete r._column;
 if(!rows.length)throw Error('상세 수량이 없습니다. 다른 수량산출 시트를 선택하세요.');
 return {kind:'quantity',rows,summary,excluded,headerRow:h+1,notice:'원본 셀의 저장 수량을 읽었습니다. 산출근거 문자열은 실행하지 않으며 단위·규격별로 대조합니다. 금액은 산정하지 않습니다.'};
}
function bill(a,name){
 const h=a.findIndex((r,i)=>i<80&&r.some(v=>['품명','명칭','항목'].includes(norm(v)))&&r.some(v=>['수량','설계수량'].includes(norm(v)))&&r.some(v=>norm(v)==='단위'));if(h<0)throw Error('상세 내역 머리글을 찾지 못했습니다. 공종별내역서 또는 수량산출 시트를 선택하세요.');
 if(/집계표|원가계산|갑지/.test(name))throw Error('계층 집계표는 중복 합산 가능성이 있습니다. 공종별내역서 시트를 선택하세요.');
 const top=a[h],leaf=a[h+1]||[],split=leaf.some(v=>['단가','금액'].includes(norm(v))),fields=new Map();let group='';
 for(let c=0;c<Math.max(top.length,leaf.length);c++){const t=norm(top[c]),l=norm(leaf[c]);if(['재료비','노무비','경비','합계'].includes(t))group=t;else if(t)group='';
  const mapped=split&&group&&['단가','금액'].includes(l)?(group==='합계'?(l==='금액'?'금액':'합계단가'):(l==='단가'?group+'단가':null)):aliases[t];
  if(mapped){if([...fields.values()].includes(mapped))throw Error('중복 머리글: '+mapped);fields.set(c,mapped);}
 }
 const rows=[],excluded=[];let section=name;
 for(let i=h+(split?2:1);i<a.length;i++){const raw=a[i]||[],r={__rowNum__:i};for(const[c,k]of fields)r[k]=raw[c]??null;
  if(!Object.entries(r).some(([k,v])=>k!=='__rowNum__'&&has(v)))continue;
  const n=norm(r.품명);if(['품명','명칭','항목'].includes(n))continue;if(!has(r.품명)&&!has(r.단위)&&!has(r.수량)&&Object.values(r).some(v=>['단가','금액'].includes(norm(v))))continue;
  if(/^(소계|합계|총계|총합계|부가세|부가가치세)$/.test(n.replace(/[\[\]()【】]/g,''))){excluded.push({원본행:i+1,품명:text(r.품명),금액:r.금액,제외사유:'상세 내역과 중복 합산 방지'});continue;}
  const grouping=!has(r.단위)&&has(r.품명)&&(!has(r.수량)||/^\d{2,}\s/.test(text(r.품명)));
  if(grouping){section=text(r.품명).replace(/^\d+\s+/,'');excluded.push({원본행:i+1,품명:text(r.품명),금액:r.금액,제외사유:'공종 제목·계층 집계행'});continue;}
  r.공종=has(r.공종)?r.공종:section;rows.push(r);
 }
 if(!rows.length)throw Error('검토할 상세 내역이 없습니다.');
 return {kind:'bill',rows,excluded,headerRow:h+1,notice:'2단 머리글의 합계 단가·금액을 구분하고 공종 제목·집계행을 제외했습니다. 선택한 시트만 검토하며 다른 시트와 자동 합산하지 않습니다.'};
}
function parse(sheet,X,name='선택 시트'){const range=sheet['!ref']?X.utils.decode_range(sheet['!ref']):{s:{r:0,c:0},e:{r:0,c:0}};if(range.e.r>=50000||range.e.c>400||(range.e.r+1)*(range.e.c+1)>2000000)throw Error('검토 범위는 50,000행·401열 이하입니다.');const a=X.utils.sheet_to_json(sheet,{header:1,defval:null,range:0,blankrows:true});return matrix(a,name,X,sheet)||bill(a,name);}
const api={parse};if(typeof module!=='undefined')module.exports=api;else root.DesignImport=api;
})(typeof window==='undefined'?globalThis:window);
