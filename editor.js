(() => {
  const layout = window.PORTFOLIO_LAYOUT;
  layout.items ||= [];
  layout.texts ||= [];
  layout.pageStyle ||= {background:'#ffffff'};

  const canvas = document.querySelector('#editor-canvas');
  const pageHeight = document.querySelector('#page-height');
  const pageColour = document.querySelector('#page-colour');
  const status = document.querySelector('#status');
  const fields = document.querySelector('#fields');
  const noSelection = document.querySelector('#no-selection');
  const textFields = document.querySelector('#text-fields');
  const mediaFields = document.querySelector('#media-fields');
  let selectedId = null;
  let gesture = null;

  const q = (s) => document.querySelector(s);
  const common = { x:q('#f-x'), y:q('#f-y'), width:q('#f-width'), z:q('#f-z') };
  const textInputs = {
    text:q('#f-text'), link:q('#f-text-link'), newTab:q('#f-new-tab'), fontFamily:q('#f-font-family'),
    fontSize:q('#f-font-size'), color:q('#f-color'), background:q('#f-background'), backgroundEnabled:q('#f-background-enabled'),
    fontWeight:q('#f-font-weight'), italic:q('#f-italic'), underline:q('#f-underline'), align:q('#f-align'),
    lineHeight:q('#f-line-height'), letterSpacing:q('#f-letter-spacing'), rotation:q('#f-text-rotation'), opacity:q('#f-text-opacity')
  };
  const mediaInputs = {
    title:q('#f-title'), caption:q('#f-caption'), src:q('#f-src'), type:q('#f-type'), hoverSrc:q('#f-hover'),
    showCaption:q('#f-caption-show'), clickable:q('#f-clickable'), link:q('#f-link'), rotation:q('#f-media-rotation'), opacity:q('#f-media-opacity'),
    captionFontFamily:q('#f-caption-font'), captionFontSize:q('#f-caption-size'), captionColor:q('#f-caption-color'), captionAlign:q('#f-caption-align')
  };

  const scale = () => canvas.clientWidth / layout.designWidth;
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const selected = () => {
    const text = layout.texts.find(i => i.id === selectedId);
    if (text) return {kind:'text', item:text};
    const media = layout.items.find(i => i.id === selectedId);
    if (media) return {kind:'media', item:media};
    return null;
  };

  function setCanvasHeight(){
    canvas.style.height = `${layout.pageHeight * scale()}px`;
    canvas.style.background = layout.pageStyle.background || '#ffffff';
    pageHeight.value = Math.round(layout.pageHeight);
    pageColour.value = layout.pageStyle.background || '#ffffff';
  }

  function applyTextStyle(el,item,s){
    el.style.fontFamily=item.fontFamily||'Arial, Helvetica, sans-serif';
    el.style.fontSize=`${(Number(item.fontSize)||15)*s}px`;
    el.style.color=item.color||'#111111';
    el.style.background=item.backgroundEnabled?(item.background||'#ffffff'):'transparent';
    el.style.fontWeight=String(item.fontWeight??400);
    el.style.fontStyle=item.italic?'italic':'normal';
    el.style.textDecoration=item.underline?'underline':'none';
    el.style.textAlign=item.align||'left';
    el.style.lineHeight=String(item.lineHeight??1.25);
    el.style.letterSpacing=`${(Number(item.letterSpacing)||0)*s}px`;
    el.style.opacity=String(clamp(Number(item.opacity??1),0,1));
    el.style.transform=`rotate(${Number(item.rotation)||0}deg)`;
    el.style.transformOrigin='top left';
  }

  function textElement(item){
    const el=document.createElement('article');
    el.className='editor-item editor-text'; el.dataset.id=item.id; el.dataset.kind='text';
    const content=document.createElement('div'); content.className='editor-text-content'; content.textContent=item.text||''; el.appendChild(content);
    const handle=document.createElement('span'); handle.className='resize-handle'; handle.title='Drag to resize width'; el.appendChild(handle);
    el.addEventListener('pointerdown',startGesture); return el;
  }

  function mediaElement(item){
    const el=document.createElement('article'); el.className='editor-item editor-media'; el.dataset.id=item.id; el.dataset.kind='media';
    const fig=document.createElement('figure');
    const img=document.createElement('img'); img.src=item.src; img.alt=''; fig.appendChild(img);
    if(item.hoverSrc){ const h=document.createElement('img'); h.src=item.hoverSrc; h.alt=''; h.className='hover-preview'; fig.appendChild(h); }
    if(item.type!=='image'){ const b=document.createElement('span'); b.className='type-badge'; b.textContent=item.type; fig.appendChild(b); }
    if(item.showCaption&&item.caption){ const c=document.createElement('figcaption'); c.textContent=item.caption; c.style.fontFamily=item.captionFontFamily||'Arial, Helvetica, sans-serif'; c.style.fontSize=`${(Number(item.captionFontSize)||12)*scale()}px`; c.style.color=item.captionColor||'#111111'; c.style.textAlign=item.captionAlign||'left'; fig.appendChild(c); }
    el.appendChild(fig);
    const handle=document.createElement('span'); handle.className='resize-handle'; handle.title='Drag to resize width'; el.appendChild(handle);
    el.addEventListener('pointerdown', startGesture); return el;
  }

  function positionElement(el,item,kind){
    const s=scale();
    el.style.left=`${item.x*s}px`; el.style.top=`${item.y*s}px`; el.style.width=`${item.width*s}px`; el.style.zIndex=item.z||1;
    if(kind==='text') applyTextStyle(el.querySelector('.editor-text-content'),item,s);
    else { el.style.opacity=String(clamp(Number(item.opacity??1),0,1)); el.style.transform=`rotate(${Number(item.rotation)||0}deg)`; el.style.transformOrigin='top left'; }
    el.classList.toggle('selected',item.id===selectedId);
  }

  function render(){
    canvas.innerHTML=''; setCanvasHeight();
    const objects=[
      ...layout.items.map(item=>({kind:'media',item})),
      ...layout.texts.map(item=>({kind:'text',item}))
    ].sort((a,b)=>(Number(a.item.z)||1)-(Number(b.item.z)||1));
    objects.forEach(({kind,item})=>{ const el=kind==='text'?textElement(item):mediaElement(item); positionElement(el,item,kind); canvas.appendChild(el); });
    updateInspector();
  }

  function select(id){
    selectedId=id;
    document.querySelectorAll('.editor-item').forEach(el=>el.classList.toggle('selected',el.dataset.id===id));
    updateInspector();
  }

  function updateInspector(){
    const sel=selected(); fields.hidden=!sel; noSelection.hidden=!!sel; textFields.hidden=!sel||sel.kind!=='text'; mediaFields.hidden=!sel||sel.kind!=='media';
    if(!sel) return;
    const item=sel.item;
    Object.entries(common).forEach(([key,input])=>input.value=item[key]??'');
    if(sel.kind==='text'){
      Object.entries(textInputs).forEach(([key,input])=>{
        if(input.type==='checkbox') input.checked=!!item[key]; else input.value=item[key]??'';
      });
      status.textContent=`TEXT: ${(item.text||'').slice(0,35)} — x ${Math.round(item.x)}, y ${Math.round(item.y)}, width ${Math.round(item.width)}`;
    } else {
      Object.entries(mediaInputs).forEach(([key,input])=>{
        if(input.type==='checkbox') input.checked=!!item[key]; else input.value=item[key]??'';
      });
      status.textContent=`MEDIA: ${item.title||item.id} — x ${Math.round(item.x)}, y ${Math.round(item.y)}, width ${Math.round(item.width)}`;
    }
  }

  function startGesture(e){
    const el=e.currentTarget; const selId=el.dataset.id; select(selId); const sel=selected(); if(!sel)return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    gesture={id:selId,kindObject:sel.kind,action:e.target.classList.contains('resize-handle')?'resize':'move',startX:e.clientX,startY:e.clientY,x:sel.item.x,y:sel.item.y,width:sel.item.width,pointerId:e.pointerId};
    el.addEventListener('pointermove',moveGesture); el.addEventListener('pointerup',endGesture); el.addEventListener('pointercancel',endGesture);
  }

  function moveGesture(e){
    if(!gesture)return; const sel=selected(); if(!sel)return; const item=sel.item; const s=scale();
    const dx=(e.clientX-gesture.startX)/s, dy=(e.clientY-gesture.startY)/s;
    if(gesture.action==='move'){
      item.x=clamp(Math.round(gesture.x+dx),0,Math.max(0,layout.designWidth-item.width));
      item.y=clamp(Math.round(gesture.y+dy),0,layout.pageHeight-30);
    } else {
      item.width=clamp(Math.round(gesture.width+dx),20,layout.designWidth-item.x);
    }
    const el=canvas.querySelector(`[data-id="${CSS.escape(item.id)}"]`); if(el) positionElement(el,item,sel.kind); updateInspector();
  }

  function endGesture(e){
    if(!gesture)return;
    e.currentTarget.releasePointerCapture?.(gesture.pointerId);
    e.currentTarget.removeEventListener('pointermove',moveGesture); e.currentTarget.removeEventListener('pointerup',endGesture); e.currentTarget.removeEventListener('pointercancel',endGesture); gesture=null;
  }

  function applyCommon(key){ const sel=selected(); if(!sel)return; sel.item[key]=Number(common[key].value)||0; render(); select(sel.item.id); }
  Object.keys(common).forEach(key=>common[key].addEventListener('input',()=>applyCommon(key)));

  function bindGroup(group){
    Object.entries(group).forEach(([key,input])=>{
      const ev=(input.type==='checkbox'||input.type==='color'||input.tagName==='SELECT')?'change':'input';
      input.addEventListener(ev,()=>{
        const sel=selected(); if(!sel)return;
        let value;
        if(input.type==='checkbox') value=input.checked;
        else if(input.type==='number') value=Number(input.value);
        else value=input.value;
        sel.item[key]=value; render(); select(sel.item.id);
      });
    });
  }
  bindGroup(textInputs); bindGroup(mediaInputs);

  pageHeight.addEventListener('change',()=>{ layout.pageHeight=Math.max(1000,Number(pageHeight.value)||layout.pageHeight); render(); });
  q('#add-height').addEventListener('click',()=>{ layout.pageHeight+=1000; render(); });
  pageColour.addEventListener('input',()=>{ layout.pageStyle.background=pageColour.value; canvas.style.background=pageColour.value; });

  q('#add-text').addEventListener('click',()=>{
    const maxZ=Math.max(0,...layout.items.map(i=>Number(i.z)||0),...layout.texts.map(i=>Number(i.z)||0));
    const item={id:`text-${Date.now()}`,role:'text',text:'New text',link:'',newTab:false,x:80,y:80,width:400,z:maxZ+1,fontFamily:'Arial, Helvetica, sans-serif',fontSize:28,color:'#111111',background:'#ffffff',backgroundEnabled:false,fontWeight:400,italic:false,underline:false,align:'left',lineHeight:1.2,letterSpacing:0,rotation:0,opacity:1};
    layout.texts.push(item); render(); select(item.id);
  });

  q('#add-item').addEventListener('click',()=>{
    const maxZ=Math.max(0,...layout.items.map(i=>Number(i.z)||0),...layout.texts.map(i=>Number(i.z)||0));
    const n=layout.items.length+1;
    const item={id:`item-${Date.now()}`,title:`New item ${n}`,caption:'',src:'assets/work-01.jpg',hoverSrc:'',type:'image',clickable:false,link:'',showCaption:false,x:80,y:80,width:500,z:maxZ+1,rotation:0,opacity:1,captionFontFamily:'Arial, Helvetica, sans-serif',captionFontSize:12,captionColor:'#111111',captionAlign:'left'};
    layout.items.push(item); render(); select(item.id);
  });

  q('#duplicate').addEventListener('click',()=>{
    const sel=selected(); if(!sel)return; const src=sel.item; const copy={...src,id:`${sel.kind==='text'?'text':'item'}-${Date.now()}`,x:src.x+30,y:src.y+30,z:(src.z||1)+1};
    if(sel.kind==='text') layout.texts.push(copy); else { copy.title=(src.title||'Item')+' copy'; layout.items.push(copy); }
    render(); select(copy.id);
  });

  q('#delete-item').addEventListener('click',()=>{
    const sel=selected(); if(!sel)return; const label=sel.kind==='text'?(sel.item.text||sel.item.id):(sel.item.title||sel.item.id);
    if(!confirm(`Delete “${label}” from the homepage?`))return;
    if(sel.kind==='text') layout.texts=layout.texts.filter(i=>i.id!==sel.item.id); else layout.items=layout.items.filter(i=>i.id!==sel.item.id);
    selectedId=null; render();
  });

  q('#bring-front').addEventListener('click',()=>{
    const sel=selected(); if(!sel)return; sel.item.z=Math.max(0,...layout.items.map(i=>Number(i.z)||0),...layout.texts.map(i=>Number(i.z)||0))+1; render(); select(sel.item.id);
  });

  q('#download-layout').addEventListener('click',()=>{
    const text='window.PORTFOLIO_LAYOUT = '+JSON.stringify(layout,null,2)+';\n';
    const blob=new Blob([text],{type:'text/javascript'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='layout.js'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Downloaded layout.js — replace the existing layout.js on GitHub to publish these changes.';
  });

  window.addEventListener('resize',render);
  render();
})();
