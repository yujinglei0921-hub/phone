'use strict';
// Display framing is saved separately from each original wallpaper image.
function freshWallpaperLayout(){return {fit:'cover',zoom:1,x:50,y:50}}
function cleanWallpaperLayout(value){const n=(v,f,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):f));return {fit:value?.fit==='contain'?'contain':'cover',zoom:n(value?.zoom,1,1,3),x:n(value?.x,50,0,100),y:n(value?.y,50,0,100)}}
const wallpaperBaseDefaults=defaults,wallpaperBaseNormalize=normalize;
defaults=()=>{const d=wallpaperBaseDefaults();d.settings.wallpaperLayouts={home:freshWallpaperLayout(),lock:freshWallpaperLayout()};return d};
normalize=()=>{wallpaperBaseNormalize();const v=state.settings.wallpaperLayouts;state.settings.wallpaperLayouts={home:cleanWallpaperLayout(v?.home),lock:cleanWallpaperLayout(v?.lock)}};
normalize();
const wallpaperImageSizes=new Map();
function wallpaperDimensions(source){if(wallpaperImageSizes.has(source))return wallpaperImageSizes.get(source);const result=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(Error('图片无法读取'));image.src=source});wallpaperImageSizes.set(source,result);if(wallpaperImageSizes.size>6)wallpaperImageSizes.delete(wallpaperImageSizes.keys().next().value);return result}
function wallpaperSource(type){return type==='lock'?state.settings.lockWallpaper:state.profile.wallpaper}
function wallpaperGeometry(width,height,image,layout){const scale=(layout.fit==='contain'?Math.min(width/image.width,height/image.height):Math.max(width/image.width,height/image.height))*layout.zoom;const w=image.width*scale,h=image.height*scale;return {width:w,height:h,left:(width-w)*layout.x/100,top:(height-h)*layout.y/100}}
function paintWallpaper(element,source,layout){
  if(!element)return;
  element._wallpaperConfig={source,layout:cleanWallpaperLayout(layout)};
  element.classList.toggle('has-custom-wallpaper',!!source);
  element.style.backgroundImage=source?`url("${source}")`:defaultWall;
  element.style.backgroundRepeat='no-repeat';element.style.backgroundColor=source?'#172824':'';
  if(!source){element.style.backgroundSize='cover';element.style.backgroundPosition='center';return}
  wallpaperDimensions(source).then(image=>{
    const config=element._wallpaperConfig;if(!element.isConnected||config?.source!==source)return;
    const g=wallpaperGeometry(element.clientWidth,element.clientHeight,image,config.layout);
    element.style.backgroundSize=`${g.width}px ${g.height}px`;
    element.style.backgroundPosition=`${g.left}px ${g.top}px`;
    element._wallpaperGeometry=g;
  }).catch(()=>{if(element._wallpaperConfig?.source===source)toast('壁纸无法读取，请重新上传图片')});
}
const wallpaperBaseRenderHome=renderHome;
renderHome=()=>{wallpaperBaseRenderHome();paintWallpaper(el('wall'),state.profile.wallpaper,state.settings.wallpaperLayouts.home)};
applyLockWallpaper=()=>paintWallpaper(el('lock'),state.settings.lockWallpaper,state.settings.wallpaperLayouts.lock);
function paintWallpaperPreviews(){const ratio=el('shell').clientWidth/el('shell').clientHeight;document.querySelectorAll('.wall-preview[data-wallpaper-type]').forEach(node=>{node.style.aspectRatio=String(ratio);const type=node.dataset.wallpaperType;paintWallpaper(node,wallpaperSource(type),state.settings.wallpaperLayouts[type])})}
const wallpaperBasePersonalize=renderPersonalize;
renderPersonalize=()=>{
  wallpaperBasePersonalize();
  const previews=document.querySelectorAll('.wall-preview');
  previews.forEach((node,i)=>{const type=i===0?'lock':'home';node.dataset.wallpaperType=type;node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',type==='lock'?'调整锁屏壁纸':'调整主屏幕壁纸');node.insertAdjacentHTML('beforeend','<span class="wall-preview-edit">调整构图 ↗</span>');node.onclick=()=>editWallpaper(type);node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editWallpaper(type)}}});
  const form=el('wallForm');form.onsubmit=e=>e.preventDefault();
  form.elements.lockwall.onchange=e=>selectWallpaper('lock',e.target);
  form.elements.homewall.onchange=e=>selectWallpaper('home',e.target);
  form.querySelector('button.primary').outerHTML='<p class="muted">选图后可预览、拖动和缩放，再分别保存。点按上方预览可调整已有壁纸。</p>';
  paintWallpaperPreviews();
};
restoreWall=type=>{const old=wallpaperSource(type),layout=state.settings.wallpaperLayouts[type];if(type==='lock')state.settings.lockWallpaper='';else state.profile.wallpaper='';state.settings.wallpaperLayouts[type]=freshWallpaperLayout();if(!save()){if(type==='lock')state.settings.lockWallpaper=old;else state.profile.wallpaper=old;state.settings.wallpaperLayouts[type]=layout;return}renderHome();renderPersonalize()};
let wallpaperEdit=null,wallpaperSelection=0;
async function selectWallpaper(type,input){const file=input.files[0];if(!file)return;const selection=++wallpaperSelection;const data=await imageData(file,1800);input.value='';if(!data||selection!==wallpaperSelection)return;editWallpaper(type,data)}
function editWallpaper(type,newSource){
  if(isLocked())return;
  const source=newSource||wallpaperSource(type);
  if(!source){el('wallForm')?.elements[type==='lock'?'lockwall':'homewall']?.click();return}
  closeWallpaperEditor();
  wallpaperEdit={type,source,layout:newSource?{...freshWallpaperLayout(),fit:'contain'}:cleanWallpaperLayout(state.settings.wallpaperLayouts[type])};
  const node=document.createElement('section');node.className='wallpaper-editor';node.id='wallpaperEditor';node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','调整壁纸');
  node.innerHTML=`<div class="wallpaper-editor-nav"><button class="bare" onclick="closeWallpaperEditor()">取消</button><strong>${type==='lock'?'锁屏壁纸':'主屏幕壁纸'}</strong><button class="bare" id="saveWallpaper" onclick="commitWallpaper()">保存</button></div><div class="wallpaper-editor-body"><p class="wallpaper-help">拖动图片调整位置，预览比例与当前手机屏幕一致。</p><div id="wallpaperFrame" class="wallpaper-frame" aria-label="壁纸构图预览"><div class="wallpaper-preview-ui">${type==='lock'?'<div class="wallpaper-clock">09:41</div><p>星期五 · 你的故事</p>':'<div class="wallpaper-widget-ghosts"><i></i><i></i></div><div class="wallpaper-icon-ghosts">'+Array.from({length:8},()=>'<i></i>').join('')+'</div><div class="wallpaper-dock-ghost"></div>'}</div><div class="wallpaper-home-line"></div></div><div class="wallpaper-fit-options"><button type="button" data-fit="contain" onclick="changeWallpaperFit('contain')">完整显示</button><button type="button" data-fit="cover" onclick="changeWallpaperFit('cover')">铺满屏幕</button></div><p class="wallpaper-help" id="wallpaperFitHelp"></p><label class="wallpaper-range">缩放 <span id="wallpaperZoomValue"></span><input id="wallpaperZoom" aria-label="壁纸缩放" type="range" min="1" max="3" step="0.01" oninput="updateWallpaperControl('zoom',this.value)"></label><label class="wallpaper-range">左右位置<input id="wallpaperX" aria-label="壁纸左右位置" type="range" min="0" max="100" step="0.1" oninput="updateWallpaperControl('x',this.value)"></label><label class="wallpaper-range">上下位置<input id="wallpaperY" aria-label="壁纸上下位置" type="range" min="0" max="100" step="0.1" oninput="updateWallpaperControl('y',this.value)"></label><button type="button" class="wallpaper-center" onclick="centerWallpaper()">还原位置与缩放</button></div>`;
  el('shell').append(node);const frame=el('wallpaperFrame');frame.style.aspectRatio=String(el('shell').clientWidth/el('shell').clientHeight);
  let drag=null;
  frame.addEventListener('pointerdown',e=>{if(e.button!==0||!wallpaperEdit)return;frame.setPointerCapture(e.pointerId);drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,layout:{...wallpaperEdit.layout},geometry:frame._wallpaperGeometry};frame.classList.add('dragging')});
  frame.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId||!drag.geometry||!wallpaperEdit)return;const dx=frame.clientWidth-drag.geometry.width,dy=frame.clientHeight-drag.geometry.height;wallpaperEdit.layout.x=Math.abs(dx)>0.5?Math.max(0,Math.min(100,drag.layout.x+(e.clientX-drag.x)*100/dx)):drag.layout.x;wallpaperEdit.layout.y=Math.abs(dy)>0.5?Math.max(0,Math.min(100,drag.layout.y+(e.clientY-drag.y)*100/dy)):drag.layout.y;refreshWallpaperEditor()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])frame.addEventListener(event,()=>{drag=null;frame.classList.remove('dragging')});
  refreshWallpaperEditor();node.querySelector('button').focus();
}
function refreshWallpaperEditor(){if(!wallpaperEdit||!el('wallpaperFrame'))return;const {source,layout}=wallpaperEdit;paintWallpaper(el('wallpaperFrame'),source,layout);el('wallpaperZoom').value=layout.zoom;el('wallpaperX').value=layout.x;el('wallpaperY').value=layout.y;el('wallpaperZoomValue').textContent=Math.round(layout.zoom*100)+'%';el('wallpaperFitHelp').textContent=layout.fit==='contain'?'完整显示不裁掉原图，多出的区域以深色填充；放大后仍可能裁切。':'铺满屏幕会裁去超出屏幕的部分，可拖动保留人物或重点。';document.querySelectorAll('[data-fit]').forEach(button=>{button.classList.toggle('selected',button.dataset.fit===layout.fit);button.setAttribute('aria-pressed',String(button.dataset.fit===layout.fit))})}
function updateWallpaperControl(key,value){if(!wallpaperEdit)return;wallpaperEdit.layout[key]=Number(value);wallpaperEdit.layout=cleanWallpaperLayout(wallpaperEdit.layout);refreshWallpaperEditor()}
function changeWallpaperFit(fit){if(!wallpaperEdit)return;wallpaperEdit.layout={...freshWallpaperLayout(),fit};refreshWallpaperEditor()}
function centerWallpaper(){if(!wallpaperEdit)return;wallpaperEdit.layout={...freshWallpaperLayout(),fit:wallpaperEdit.layout.fit};refreshWallpaperEditor()}
function closeWallpaperEditor(){el('wallpaperEditor')?.remove();wallpaperEdit=null}
function commitWallpaper(){
  if(!wallpaperEdit)return;const {type,source,layout}=wallpaperEdit;const previousSource=wallpaperSource(type),previousLayout=state.settings.wallpaperLayouts[type];
  if(type==='lock')state.settings.lockWallpaper=source;else state.profile.wallpaper=source;
  state.settings.wallpaperLayouts[type]=cleanWallpaperLayout(layout);
  if(!save()){if(type==='lock')state.settings.lockWallpaper=previousSource;else state.profile.wallpaper=previousSource;state.settings.wallpaperLayouts[type]=previousLayout;return}
  closeWallpaperEditor();renderHome();renderPersonalize();toast('壁纸构图已保存');
}
const wallpaperResizeObserver=new ResizeObserver(()=>{paintWallpaper(el('wall'),state.profile.wallpaper,state.settings.wallpaperLayouts.home);applyLockWallpaper();paintWallpaperPreviews();if(wallpaperEdit&&el('wallpaperFrame')){el('wallpaperFrame').style.aspectRatio=String(el('shell').clientWidth/el('shell').clientHeight);refreshWallpaperEditor()}});
wallpaperResizeObserver.observe(el('shell'));
document.addEventListener('keydown',e=>{if(!el('wallpaperEditor'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeWallpaperEditor();return}if(e.key==='Tab'){const controls=[...el('wallpaperEditor').querySelectorAll('button,input')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}},true);
renderHome();applyLockWallpaper();
