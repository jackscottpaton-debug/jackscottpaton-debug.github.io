(() => {
  const layout = window.PORTFOLIO_LAYOUT;
  const canvas = document.querySelector('#editor-canvas');
  const pageHeight = document.querySelector('#page-height');
  const status = document.querySelector('#status');
  const fields = document.querySelector('#fields');
  const noSelection = document.querySelector('#no-selection');
  let selectedId = null;
  let gesture = null;

  const inputs = {
    title: document.querySelector('#f-title'), caption: document.querySelector('#f-caption'),
    src: document.querySelector('#f-src'), type: document.querySelector('#f-type'), hoverSrc: document.querySelector('#f-hover'),
    showCaption: document.querySelector('#f-caption-show'), clickable: document.querySelector('#f-clickable'), link: document.querySelector('#f-link'),
    x: document.querySelector('#f-x'), y: document.querySelector('#f-y'), width: document.querySelector('#f-width'), z: document.querySelector('#f-z')
  };

  const selected = () => layout.items.find(i => i.id === selectedId);
  const scale = () => canvas.clientWidth / layout.designWidth;
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

  function setCanvasHeight(){ canvas.style.height = `${layout.pageHeight * scale()}px`; pageHeight.value = Math.round(layout.pageHeight); }

  function itemElement(item){
    const el=document.createElement('article'); el.className='editor-item'; el.dataset.id=item.id;
    const fig=document.createElement('figure');
    const img=document.createElement('img'); img.src=item.src; img.alt=''; fig.appendChild(img);
    if(item.hoverSrc){ const h=document.createElement('img'); h.src=item.hoverSrc; h.alt=''; h.className='hover-preview'; fig.appendChild(h); }
    if(item.type!=='image'){ const b=document.createElement('span'); b.className='type-badge'; b.textContent=item.type; fig.appendChild(b); }
    if(item.showCaption&&item.caption){ const c=document.createElement('figcaption'); c.textContent=item.caption; fig.appendChild(c); }
    el.appendChild(fig);
    const handle=document.createElement('span'); handle.className='resize-handle'; handle.title='Drag to resize'; el.appendChild(handle);
    el.addEventListener('pointerdown', startGesture);
    return el;
  }

  function positionElement(el,item){ const s=scale(); el.style.left=`${item.x*s}px`; el.style.top=`${item.y*s}px`; el.style.width=`${item.width*s}px`; el.style.zIndex=item.z||1; el.classList.toggle('selected',item.id===selectedId); }

  function render(){
    canvas.innerHTML=''; setCanvasHeight();
    layout.items.forEach(item=>{ const el=itemElement(item); positionElement(el,item); canvas.appendChild(el); });
    updateInspector();
  }

  function select(id){ selectedId=id; document.querySelectorAll('.editor-item').forEach(el=>el.classList.toggle('selected',el.dataset.id===id)); updateInspector(); }

  function updateInspector(){
    const item=selected();
    fields.hidden=!item; noSelection.hidden=!!item;
    if(!item) return;
    for(const key of ['title','caption','src','type','hoverSrc','link','x','y','width','z']) inputs[key].value=item[key] ?? '';
    inputs.showCaption.checked=!!item.showCaption; inputs.clickable.checked=!!item.clickable;
    status.textContent=`${item.title || item.id} — x ${Math.round(item.x)}, y ${Math.round(item.y)}, width ${Math.round(item.width)}`;
  }

  function startGesture(e){
    const el=e.currentTarget, item=layout.items.find(i=>i.id===el.dataset.id); if(!item) return;
    select(item.id); e.preventDefault(); el.setPointerCapture(e.pointerId);
    gesture={id:item.id,kind:e.target.classList.contains('resize-handle')?'resize':'move',startX:e.clientX,startY:e.clientY,x:item.x,y:item.y,width:item.width,pointerId:e.pointerId};
    el.addEventListener('pointermove', moveGesture); el.addEventListener('pointerup', endGesture); el.addEventListener('pointercancel', endGesture);
  }
  function moveGesture(e){
    if(!gesture) return; const item=layout.items.find(i=>i.id===gesture.id); const s=scale();
    const dx=(e.clientX-gesture.startX)/s, dy=(e.clientY-gesture.startY)/s;
    if(gesture.kind==='move'){ item.x=clamp(Math.round(gesture.x+dx),0,layout.designWidth-item.width); item.y=clamp(Math.round(gesture.y+dy),0,layout.pageHeight-50); }
    else { item.width=clamp(Math.round(gesture.width+dx),50,layout.designWidth-item.x); }
    const el=canvas.querySelector(`[data-id="${item.id}"]`); positionElement(el,item); updateInspector();
  }
  function endGesture(e){ if(!gesture)return; e.currentTarget.releasePointerCapture?.(gesture.pointerId); e.currentTarget.removeEventListener('pointermove',moveGesture); e.currentTarget.removeEventListener('pointerup',endGesture); e.currentTarget.removeEventListener('pointercancel',endGesture); gesture=null; }

  function applyField(key){
    const item=selected(); if(!item)return;
    if(['x','y','width','z'].includes(key)) item[key]=Number(inputs[key].value)||0;
    else if(['showCaption','clickable'].includes(key)) item[key]=inputs[key].checked;
    else item[key]=inputs[key].value;
    render(); select(item.id);
  }
  Object.keys(inputs).forEach(key=>{ const ev=(inputs[key].type==='checkbox'||inputs[key].tagName==='SELECT')?'change':'input'; inputs[key].addEventListener(ev,()=>applyField(key)); });

  pageHeight.addEventListener('change',()=>{ layout.pageHeight=Math.max(1000,Number(pageHeight.value)||layout.pageHeight); render(); });
  document.querySelector('#add-height').addEventListener('click',()=>{ layout.pageHeight+=1000; render(); });
  document.querySelector('#add-item').addEventListener('click',()=>{
    const maxZ=Math.max(0,...layout.items.map(i=>Number(i.z)||0)); const n=layout.items.length+1;
    const item={id:`item-${Date.now()}`,title:`New item ${n}`,caption:'',src:'assets/work-01.jpg',hoverSrc:'',type:'image',clickable:false,link:'',showCaption:false,x:80,y:80,width:500,z:maxZ+1};
    layout.items.push(item); render(); select(item.id);
  });
  document.querySelector('#duplicate').addEventListener('click',()=>{ const item=selected(); if(!item)return; const copy={...item,id:`item-${Date.now()}`,title:item.title+' copy',x:item.x+30,y:item.y+30,z:(item.z||1)+1}; layout.items.push(copy); render(); select(copy.id); });
  document.querySelector('#delete-item').addEventListener('click',()=>{ const item=selected(); if(!item)return; if(!confirm(`Delete “${item.title || item.id}” from the layout?`))return; layout.items=layout.items.filter(i=>i.id!==item.id); selectedId=null; render(); });
  document.querySelector('#bring-front').addEventListener('click',()=>{ const item=selected(); if(!item)return; item.z=Math.max(0,...layout.items.map(i=>Number(i.z)||0))+1; render(); select(item.id); });

  document.querySelector('#download-layout').addEventListener('click',()=>{
    const text='window.PORTFOLIO_LAYOUT = '+JSON.stringify(layout,null,2)+';\n';
    const blob=new Blob([text],{type:'text/javascript'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='layout.js'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); status.textContent='Downloaded layout.js — upload it to GitHub to save these changes.';
  });
  window.addEventListener('resize',render);
  render();
})();
