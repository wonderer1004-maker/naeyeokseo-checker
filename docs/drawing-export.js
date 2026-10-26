/* CAD geometry and dependency-free raster PDF writer. No network requests. */
(function (root) {
  'use strict';
  function dxf(layout) {
    if (!layout || !Number.isFinite(layout.side) || layout.side <= 0) throw new Error('먼저 배치를 계산하세요.');
    let out = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
    for (const p of layout.polygons) {
      if (!/^[A-Z_]+$/.test(p.layer) || p.points.some(v => v.some(n => !Number.isFinite(n)))) throw new Error('도면 좌표 오류');
      out += '0\nLWPOLYLINE\n100\nAcDbEntity\n8\n' + p.layer + '\n100\nAcDbPolyline\n90\n' + p.points.length + '\n70\n1\n' + p.points.map(([x,y]) => '10\n'+x+'\n20\n'+y+'\n').join('');
    }
    const text = (x,y,size,value) => '0\nTEXT\n100\nAcDbEntity\n8\nNOTES\n100\nAcDbText\n10\n'+x+'\n20\n'+y+'\n30\n0\n40\n'+size+'\n1\n'+value+'\n';
    const h = Math.max(.25, layout.side / 60);
    out += text(0,layout.side+h*5,h,'CONCEPT ONLY / FLAT SQUARE SITE / UNITS: METRES');
    out += text(0,layout.side+h*3,h,'MODULES: '+layout.count+' / DC: '+layout.capacityKw.toFixed(2)+' kW');
    out += text(0,layout.side+h,h,'NORTH: +Y / EAST: +X / PHOTO EVIDENCE IS NOT SURVEY DATA');
    out += text(0,-h*2,h,'ASSUMED SITE WIDTH: '+layout.side.toFixed(2)+' m');
    return out+'0\nENDSEC\n0\nEOF\n';
  }
  function pdf(pages) {
    if (!pages.length) throw new Error('PDF 페이지가 없습니다.');
    const encode = s => new TextEncoder().encode(s), parts = [], offsets = [0]; let size=0;
    const append = x => { const b=typeof x==='string'?encode(x):x; parts.push(b); size+=b.length; };
    const object = (id,body) => { offsets[id]=size; append(id+' 0 obj\n'); body(); append('\nendobj\n'); };
    append('%PDF-1.4\n% raster drawing report\n');
    object(1,()=>append('<< /Type /Catalog /Pages 2 0 R >>'));
    object(2,()=>append('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
    pages.forEach((p,i)=>{
      if (!(p.jpeg instanceof Uint8Array) || p.jpeg[0]!==255 || p.jpeg[1]!==216 || !Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width<=0 || p.height<=0) throw new Error('PDF 이미지 오류');
      const id=3+i*3, content='q\n1190.55 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
      object(id,()=>append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1190.55 841.89] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>'));
      object(id+1,()=>{append('<< /Type /XObject /Subtype /Image /Width '+p.width+' /Height '+p.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpeg.length+' >>\nstream\n');append(p.jpeg);append('\nendstream');});
      object(id+2,()=>append('<< /Length '+encode(content).length+' >>\nstream\n'+content+'endstream'));
    });
    const xref=size, count=3+pages.length*3;
    append('xref\n0 '+count+'\n0000000000 65535 f \n');
    for(let i=1;i<count;i++)append(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    append('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    const result=new Uint8Array(size);let at=0;for(const b of parts){result.set(b,at);at+=b.length;}return result;
  }
  const api={dxf,pdf};
  if(typeof module!=='undefined')module.exports=api;else root.DrawingExport=api;
})(typeof window==='undefined'?globalThis:window);
