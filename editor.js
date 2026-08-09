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
  const assetLibrary = document.querySelector('#asset-library');
  const assetLibraryStatus = document.querySelector('#asset-library-status');
  const localAddInput = document.querySelector('#add-local-image');
  const localReplaceInput = document.querySelector('#f-local-file');
  const preparedNote = document.querySelector('#prepared-file-note');
  const downloadSelectedImage = document.querySelector('#download-selected-image');
  let selectedId = null;
  let gesture = null;

  // Local previews/blobs never go into layout.js. They exist only while this editor tab is open.
  const temporaryPreviews = new Map();
  const preparedFiles = new Map();

  const q = (s) => document.querySelector(s);
  const common = { x:q('#f-x'), y:q('#f-y'), width:q('#f-width'), z:q('#f-z') };
  const textInputs = {
    text:q('#f-text'), scrollTarget:q('#f-scroll-target'), link:q('#f-text-link'), newTab:q('#f-new-tab'), fontFamily:q('#f-font-family'),
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
    const img=document.createElement('img');
    img.src=temporaryPreviews.get(item.id) || item.src;
    img.alt='';
    img.addEventListener('error',()=>{ img.style.minHeight='80px'; img.style.background='#eee'; });
    fig.appendChild(img);
    if(item.hoverSrc && !temporaryPreviews.has(item.id)){ const h=document.createElement('img'); h.src=item.hoverSrc; h.alt=''; h.className='hover-preview'; fig.appendChild(h); }
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

  function updatePreparedUI(sel){
    if(!sel || sel.kind!=='media'){
      preparedNote.textContent='Choose a large photo here and the editor will make a smaller web copy for you.';
      downloadSelectedImage.disabled=true;
      return;
    }
    const prepared=preparedFiles.get(sel.item.id);
    if(prepared){
      const mb=(prepared.blob.size/1024/1024).toFixed(1);
      preparedNote.textContent=`Ready: ${prepared.name} (${mb} MB). Download it, then upload it into the assets folder on GitHub.`;
      downloadSelectedImage.disabled=false;
    }else{
      preparedNote.textContent='Choose a large photo here and the editor will make a smaller web copy for you.';
      downloadSelectedImage.disabled=true;
    }
  }

  function refreshScrollTargetOptions(currentValue='') {
    const select = textInputs.scrollTarget;
    if (!select) return;
    const previous = currentValue || select.value || '';
    select.innerHTML = '';
    const normal = document.createElement('option');
    normal.value = '';
    normal.textContent = '— use normal link instead —';
    select.appendChild(normal);
    const top = document.createElement('option');
    top.value = '__top__';
    top.textContent = 'Top of page';
    select.appendChild(top);

    const choices = [
      ...layout.texts.map(item => ({id:item.id, y:Number(item.y)||0, label:`TEXT — ${(item.text || item.id).replace(/\s+/g,' ').slice(0,55)}`})),
      ...layout.items.map(item => ({id:item.id, y:Number(item.y)||0, label:`IMAGE — ${(item.title || item.id).slice(0,55)}`}))
    ].filter(choice => choice.id !== selectedId).sort((a,b)=>a.y-b.y);

    choices.forEach(choice => {
      const option = document.createElement('option');
      option.value = choice.id;
      option.textContent = `${Math.round(choice.y)}px · ${choice.label}`;
      select.appendChild(option);
    });
    select.value = previous;
  }

  function updateInspector(){
    const sel=selected(); fields.hidden=!sel; noSelection.hidden=!!sel; textFields.hidden=!sel||sel.kind!=='text'; mediaFields.hidden=!sel||sel.kind!=='media';
    updatePreparedUI(sel);
    if(!sel) return;
    const item=sel.item;
    Object.entries(common).forEach(([key,input])=>input.value=item[key]??'');
    if(sel.kind==='text'){
      refreshScrollTargetOptions(item.scrollTarget || '');
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
        sel.item[key]=value;
        // If the path was manually changed, stop using an old local preview.
        if(group===mediaInputs && key==='src' && temporaryPreviews.has(sel.item.id)){
          URL.revokeObjectURL(temporaryPreviews.get(sel.item.id));
          temporaryPreviews.delete(sel.item.id);
          preparedFiles.delete(sel.item.id);
        }
        render(); select(sel.item.id);
      });
    });
  }
  bindGroup(textInputs); bindGroup(mediaInputs);

  pageHeight.addEventListener('change',()=>{ layout.pageHeight=Math.max(1000,Number(pageHeight.value)||layout.pageHeight); render(); });
  q('#add-height').addEventListener('click',()=>{ layout.pageHeight+=1000; render(); });
  pageColour.addEventListener('input',()=>{ layout.pageStyle.background=pageColour.value; canvas.style.background=pageColour.value; });

  function maxZ(){ return Math.max(0,...layout.items.map(i=>Number(i.z)||0),...layout.texts.map(i=>Number(i.z)||0)); }
  function visibleInsertPosition(width=500){
    const rect=canvas.getBoundingClientRect();
    const viewportY=Math.max(0,-rect.top+120);
    const y=clamp(Math.round(viewportY/scale()),40,layout.pageHeight-200);
    return {x:clamp(80,0,layout.designWidth-width),y};
  }
  function createMedia(src,title='New image'){
    const width=500; const pos=visibleInsertPosition(width);
    const item={id:`item-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title,caption:'',src,hoverSrc:'',type:'image',clickable:false,link:'',showCaption:false,x:pos.x,y:pos.y,width,z:maxZ()+1,rotation:0,opacity:1,captionFontFamily:'Arial, Helvetica, sans-serif',captionFontSize:12,captionColor:'#111111',captionAlign:'left'};
    layout.items.push(item); render(); select(item.id); return item;
  }

  q('#add-text').addEventListener('click',()=>{
    const pos=visibleInsertPosition(400);
    const item={id:`text-${Date.now()}`,role:'text',text:'New text',scrollTarget:'',link:'',newTab:false,x:pos.x,y:pos.y,width:400,z:maxZ()+1,fontFamily:'Arial, Helvetica, sans-serif',fontSize:28,color:'#111111',background:'#ffffff',backgroundEnabled:false,fontWeight:400,italic:false,underline:false,align:'left',lineHeight:1.2,letterSpacing:0,rotation:0,opacity:1};
    layout.texts.push(item); render(); select(item.id);
  });

  q('#add-item').addEventListener('click',()=>createMedia('assets/work-01.jpg',`New item ${layout.items.length+1}`));

  function cleanBaseName(filename){
    return filename.replace(/\.[^.]+$/,'').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase() || 'image';
  }
  function uniqueWebName(filename,ext){
    const base=cleanBaseName(filename);
    const stamp=Date.now().toString().slice(-6);
    return `${base}-${stamp}.${ext}`;
  }
  function loadImageElement(file){
    return new Promise((resolve,reject)=>{
      const img=new Image(); const url=URL.createObjectURL(file);
      img.onload=()=>{ URL.revokeObjectURL(url); resolve(img); };
      img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src=url;
    });
  }
  async function prepareFile(file){
    const lower=file.name.toLowerCase();
    if(lower.endsWith('.gif') || file.type==='image/gif'){
      return {blob:file,name:uniqueWebName(file.name,'gif'),type:'gif'};
    }
    const img=await loadImageElement(file);
    const maxDim=2400;
    const ratio=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight));
    const w=Math.max(1,Math.round(img.naturalWidth*ratio));
    const h=Math.max(1,Math.round(img.naturalHeight*ratio));
    const canvasEl=document.createElement('canvas'); canvasEl.width=w; canvasEl.height=h;
    const ctx=canvasEl.getContext('2d'); ctx.drawImage(img,0,0,w,h);
    const blob=await new Promise(resolve=>canvasEl.toBlob(resolve,'image/webp',0.86));
    if(!blob) return {blob:file,name:uniqueWebName(file.name,(file.name.split('.').pop()||'jpg').toLowerCase()),type:'image'};
    return {blob,name:uniqueWebName(file.name,'webp'),type:'image'};
  }
  function setPreparedOnItem(item,prepared){
    if(temporaryPreviews.has(item.id)) URL.revokeObjectURL(temporaryPreviews.get(item.id));
    const url=URL.createObjectURL(prepared.blob);
    temporaryPreviews.set(item.id,url);
    preparedFiles.set(item.id,prepared);
    item.src=`assets/${prepared.name}`;
    item.type=prepared.type;
    item.title=item.title && !item.title.startsWith('New item') && item.title!=='New image' ? item.title : cleanBaseName(prepared.name).replace(/-/g,' ');
    render(); select(item.id);
    const mb=(prepared.blob.size/1024/1024).toFixed(1);
    status.textContent=`Local preview ready: ${prepared.name} (${mb} MB). Click “Download web copy”, then upload that file into GitHub/assets.`;
  }
  async function handleLocalFile(file,targetItem=null){
    if(!file) return;
    status.textContent='Preparing image…';
    try{
      const prepared=await prepareFile(file);
      const item=targetItem || createMedia(`assets/${prepared.name}`,cleanBaseName(file.name).replace(/-/g,' '));
      setPreparedOnItem(item,prepared);
    }catch(err){
      status.textContent=`Could not prepare that image: ${err.message}`;
    }
  }
  localAddInput.addEventListener('change',async()=>{ const file=localAddInput.files?.[0]; await handleLocalFile(file); localAddInput.value=''; });
  localReplaceInput.addEventListener('change',async()=>{ const sel=selected(); if(!sel || sel.kind!=='media')return; const file=localReplaceInput.files?.[0]; await handleLocalFile(file,sel.item); localReplaceInput.value=''; });
  downloadSelectedImage.addEventListener('click',()=>{
    const sel=selected(); if(!sel || sel.kind!=='media')return; const prepared=preparedFiles.get(sel.item.id); if(!prepared)return;
    const url=URL.createObjectURL(prepared.blob); const a=document.createElement('a'); a.href=url; a.download=prepared.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1200);
    status.textContent=`Downloaded ${prepared.name}. Upload it into the assets folder on GitHub.`;
  });

  async function loadAssetLibrary(){
    assetLibrary.innerHTML='';
    assetLibraryStatus.textContent='Loading image library…';
    const host=location.hostname;
    if(!host.endsWith('.github.io')){
      assetLibraryStatus.textContent='The thumbnail library works on the live GitHub Pages editor. Local copies can still use “Add image from Mac”.';
      return;
    }
    const owner=host.split('.')[0];
    const repo=`${owner}.github.io`;
    try{
      const res=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/assets`,{headers:{'Accept':'application/vnd.github+json'}});
      if(!res.ok) throw new Error(`GitHub returned ${res.status}`);
      const files=await res.json();
      const images=files.filter(f=>f.type==='file' && /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name));
      assetLibraryStatus.textContent=images.length?`${images.length} images found. Click one to use it.`:'No images found in assets yet.';
      images.sort((a,b)=>a.name.localeCompare(b.name)).forEach(file=>{
        const btn=document.createElement('button'); btn.type='button'; btn.className='asset-card';
        if(/\.gif$/i.test(file.name)) btn.classList.add('is-gif'); if(/\.webp$/i.test(file.name)) btn.classList.add('is-webp');
        const img=document.createElement('img'); img.src=file.download_url; img.alt=file.name; img.loading='lazy';
        const label=document.createElement('span'); label.textContent=file.name;
        btn.append(img,label);
        btn.addEventListener('click',()=>{
          const path=`assets/${file.name}`;
          const sel=selected();
          if(sel && sel.kind==='media'){
            if(temporaryPreviews.has(sel.item.id)) URL.revokeObjectURL(temporaryPreviews.get(sel.item.id));
            temporaryPreviews.delete(sel.item.id); preparedFiles.delete(sel.item.id);
            sel.item.src=path; sel.item.type=/\.gif$/i.test(file.name)?'gif':'image'; render(); select(sel.item.id);
            status.textContent=`Using ${file.name}.`;
          }else{
            const item=createMedia(path,file.name.replace(/\.[^.]+$/,'')); item.type=/\.gif$/i.test(file.name)?'gif':'image'; render(); select(item.id);
            status.textContent=`Added ${file.name}.`;
          }
        });
        assetLibrary.appendChild(btn);
      });
    }catch(err){
      assetLibraryStatus.textContent=`Could not load the GitHub image list (${err.message}). You can still add from your Mac or type an assets/ filename.`;
    }
  }
  q('#refresh-library').addEventListener('click',loadAssetLibrary);

  q('#duplicate').addEventListener('click',()=>{
    const sel=selected(); if(!sel)return; const src=sel.item; const copy={...src,id:`${sel.kind==='text'?'text':'item'}-${Date.now()}`,x:src.x+30,y:src.y+30,z:(src.z||1)+1};
    if(sel.kind==='text') layout.texts.push(copy); else { copy.title=(src.title||'Item')+' copy'; layout.items.push(copy); }
    render(); select(copy.id);
  });

  q('#delete-item').addEventListener('click',()=>{
    const sel=selected(); if(!sel)return; const label=sel.kind==='text'?(sel.item.text||sel.item.id):(sel.item.title||sel.item.id);
    if(!confirm(`Delete “${label}” from the homepage?`))return;
    if(temporaryPreviews.has(sel.item.id)) URL.revokeObjectURL(temporaryPreviews.get(sel.item.id));
    temporaryPreviews.delete(sel.item.id); preparedFiles.delete(sel.item.id);
    if(sel.kind==='text') layout.texts=layout.texts.filter(i=>i.id!==sel.item.id); else layout.items=layout.items.filter(i=>i.id!==sel.item.id);
    selectedId=null; render();
  });

  q('#bring-front').addEventListener('click',()=>{
    const sel=selected(); if(!sel)return; sel.item.z=maxZ()+1; render(); select(sel.item.id);
  });

  // Return a deep copy of the *current unsaved* editor state for preview.html.
  // Locally-added images are swapped to their temporary blob URLs so they can
  // be previewed before they have been uploaded to GitHub/Cloudinary.
  window.__getPortfolioPreviewState = () => {
    const copy = (typeof structuredClone === 'function')
      ? structuredClone(layout)
      : JSON.parse(JSON.stringify(layout));
    (copy.items || []).forEach((item) => {
      const localUrl = temporaryPreviews.get(item.id);
      if (localUrl) item.src = localUrl;
    });
    return copy;
  };

  q('#preview-site').addEventListener('click',()=>{
    const url=`preview.html?v=${Date.now()}`;
    const win=window.open(url,'portfolio-current-preview');
    if(win){
      win.focus();
      status.textContent='Preview opened from the current editor state. No GitHub upload is needed.';
    }else{
      status.textContent='Your browser blocked the preview window. Allow pop-ups for this site and try again.';
    }
  });

  q('#download-layout').addEventListener('click',()=>{
    const text='window.PORTFOLIO_LAYOUT = '+JSON.stringify(layout,null,2)+';\n';
    const blob=new Blob([text],{type:'text/javascript'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='layout.js'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    if(preparedFiles.size){
      status.textContent=`Downloaded layout.js. You also have ${preparedFiles.size} locally prepared image${preparedFiles.size===1?'':'s'} — download each web copy and upload it to GitHub/assets.`;
    }else{
      status.textContent='Downloaded layout.js — replace the existing layout.js on GitHub to publish these changes.';
    }
  });

  window.addEventListener('resize',render);
  window.addEventListener('beforeunload',()=>temporaryPreviews.forEach(url=>URL.revokeObjectURL(url)));
  render();
  loadAssetLibrary();
})();
