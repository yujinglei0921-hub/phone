'use strict';
// IndexedDB keeps large image-bearing snapshots out of localStorage's small per-origin quota.
// A save is acknowledged visually only after the transaction completes. Failed writes retain
// the latest in-memory snapshot, offer retry/export, and never replace the previous DB record.
const phoneStorage={mode:'loading',phase:'loading',db:null,pending:null,busy:false,version:0,committed:0,error:'',deferredToast:'',initializing:true};
window.phoneStorage=phoneStorage;
const storageBaseToast=toast;
toast=message=>{if(phoneStorage.mode==='indexeddb'&&(phoneStorage.busy||phoneStorage.pending)&&/(已保存|已更新|已设置|保存成功|已恢复|已导入|已添加|已删除|已重置|已移除|已还原|已关闭|已载入|已转发|已取消)/.test(message)){phoneStorage.deferredToast=message;return}storageBaseToast(message)};
const storageLoader=document.createElement('div');storageLoader.id='phoneStorageLoader';storageLoader.className='storage-loader';storageLoader.innerHTML='<div class="storage-spinner"></div><strong>正在读取本机数据</strong><p>正在准备照片、聊天和故事内容…</p>';el('shell').append(storageLoader);
const storageBanner=document.createElement('div');storageBanner.id='phoneStorageBanner';storageBanner.className='storage-banner hide';storageBanner.setAttribute('role','status');el('shell').append(storageBanner);
const storageLoadingHTML=storageLoader.innerHTML;
function storageBlockedScreen(){storageLoader.innerHTML='<strong>本机数据暂时无法读取</strong><p>'+esc(phoneStorage.error)+'</p><p>原存储不会被覆盖或清除。</p><div class="storage-loader-actions"><button onclick="retryPhoneStorage()">重试读取</button><button onclick="exportBackup()">导出当前数据</button></div>';storageLoader.classList.remove('hide')}
function storageAttachDatabase(db){phoneStorage.db=db;const unavailable=()=>{if(phoneStorage.db!==db)return;db.close();phoneStorage.db=null;phoneStorage.phase='error';phoneStorage.error='本机存储暂时不可用，请重试或导出备份。';window.phoneStorageWrite=()=>false;storageRenderStatus()};db.onversionchange=unavailable;db.onclose=unavailable}
function storageErrorText(error){return error?.name==='QuotaExceededError'?'浏览器存储空间不足，内容仍保留在当前页面。':error?.name==='SecurityError'?'浏览器限制了本地保存，内容仍保留在当前页面。':'保存失败，内容仍保留在当前页面。'}
function storageRenderStatus(){
  const failed=phoneStorage.phase==='error'||phoneStorage.phase==='blocked',pending=phoneStorage.busy||!!phoneStorage.pending;
  storageBanner.classList.toggle('error',failed);storageBanner.classList.toggle('hide',!failed);
  if(failed)storageBanner.innerHTML='<strong>'+esc(phoneStorage.error)+'</strong><p>先保持页面打开，可以重试或导出备份。</p><div><button onclick="retryPhoneStorage()">重试保存</button><button onclick="exportBackup()">导出完整备份</button></div>';
  else storageBanner.innerHTML='';
  const noteStatus=el('ntSaveStatus');if(noteStatus&&phoneStorage.mode==='indexeddb')noteStatus.textContent=failed?'尚未保存，请重试或导出备份':pending?'正在保存…':'已保存';
  const settingsStatus=el('phoneStorageSettingsStatus');if(settingsStatus)settingsStatus.textContent=phoneStorage.mode==='indexeddb'?(failed?'保存失败，请重试':pending?'正在保存到浏览器':'扩展存储 · 已保存到本机'):phoneStorage.mode==='localstorage'?'兼容模式 · 浏览器本地存储':'正在读取本机数据';
}
function storageUpdateSoon(){queueMicrotask(storageRenderStatus)}
function storageOpenDatabase(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(new DOMException('IndexedDB unavailable','NotSupportedError'));let request;try{request=indexedDB.open('phone-life-local-data',1)}catch(error){reject(error);return}request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('snapshots'))request.result.createObjectStore('snapshots')};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Unable to open storage'));request.onblocked=()=>reject(Error('Close another older version of this phone to open storage'))})}
function storageReadRecord(db){return new Promise((resolve,reject)=>{let transaction;try{transaction=db.transaction('snapshots','readonly')}catch(error){reject(error);return}const request=transaction.objectStore('snapshots').get(KEY);let value;request.onsuccess=()=>value=request.result;transaction.oncomplete=()=>resolve(value);transaction.onabort=()=>reject(transaction.error||Error('Read aborted'));transaction.onerror=()=>{}})}
function storageWriteRecord(db,json){return new Promise((resolve,reject)=>{let transaction;try{transaction=db.transaction('snapshots','readwrite');transaction.objectStore('snapshots').put({json,format:1,savedAt:Date.now()},KEY)}catch(error){try{transaction?.abort()}catch{}reject(error);return}transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error||new DOMException('Write aborted','AbortError'));transaction.onerror=()=>{}})}
function storageValidateState(value){return value&&typeof value==='object'&&value.profile&&Array.isArray(value.contacts)&&Array.isArray(value.photos)}
function storageUseIndexedDB(){
  phoneStorage.mode='indexeddb';
  window.phoneStorageWrite=current=>{let json;try{json=JSON.stringify(current)}catch{storageBaseToast('内容无法保存，请先导出备份');return false}phoneStorage.pending={json,version:++phoneStorage.version};phoneStorage.error='';phoneStorage.phase='saving';storageUpdateSoon();storageFlush();return true};
  window.phoneStorageBooting=false;
}
async function storageFlush(){
  if(phoneStorage.busy||!phoneStorage.pending||!phoneStorage.db)return;
  phoneStorage.busy=true;
  while(phoneStorage.pending){
    const snapshot=phoneStorage.pending;phoneStorage.pending=null;
    try{await storageWriteRecord(phoneStorage.db,snapshot.json);phoneStorage.committed=snapshot.version}
    catch(error){if(!phoneStorage.pending||phoneStorage.pending.version<snapshot.version)phoneStorage.pending=snapshot;phoneStorage.phase='error';phoneStorage.error=storageErrorText(error);phoneStorage.busy=false;phoneStorage.deferredToast='';storageRenderStatus();return}
  }
  phoneStorage.busy=false;phoneStorage.phase='saved';phoneStorage.error='';storageRenderStatus();
  if(phoneStorage.deferredToast){const message=phoneStorage.deferredToast;phoneStorage.deferredToast='';storageBaseToast(message)}
}
async function retryPhoneStorage(){
  if(phoneStorage.phase==='blocked'){await initializePhoneStorage();return}
  if(phoneStorage.mode==='localstorage'){if(save()){phoneStorage.phase='saved';phoneStorage.error='';storageRenderStatus();storageBaseToast('已保存')}return}
  if(phoneStorage.mode!=='indexeddb')return;
  if(!phoneStorage.db){try{storageAttachDatabase(await storageOpenDatabase());storageUseIndexedDB()}catch(error){phoneStorage.error=storageErrorText(error);storageRenderStatus();return}}
  phoneStorage.pending=null;phoneStorage.error='';if(save())storageRenderStatus();
}
function storageRestoreScreen(){
  activeChat='';activeGroup='';el('chatView').classList.remove('active');el('photoView').classList.remove('active');currentApp='';el('appScreen').classList.remove('active');el('shell').classList.remove('in-app','is-locked');el('lock').classList.remove('active');renderHome();
  if(state.settings.locked)toggleLock(true);document.dispatchEvent(new Event('phone-state-restored'));
}
async function initializePhoneStorage(){
  if(phoneStorage.db&&!phoneStorage.busy){phoneStorage.db.close();phoneStorage.db=null}
  phoneStorage.initializing=true;phoneStorage.phase='loading';storageLoader.innerHTML=storageLoadingHTML;storageLoader.classList.remove('hide');storageBanner.classList.add('hide');
  let db;
  try{db=await storageOpenDatabase()}
  catch(error){
    let priorBackend='',legacyReadable=true;try{priorBackend=localStorage.getItem('phone-life-storage-backend')||''}catch{legacyReadable=false}
    if(priorBackend==='indexeddb-v1'||!legacyReadable){phoneStorage.phase='blocked';phoneStorage.error=legacyReadable?'无法读取此前的本机数据，请重试或使用原来的浏览器窗口。':'浏览器禁止读取本机数据，请使用允许本地存储的普通窗口。';phoneStorage.mode='blocked';window.phoneStorageWrite=()=>{storageRenderStatus();return false};window.phoneStorageBooting=false;phoneStorage.initializing=false;storageRenderStatus();storageBlockedScreen();return}
    phoneStorage.mode='localstorage';phoneStorage.phase='saved';window.phoneStorageWrite=null;window.phoneStorageBooting=false;phoneStorage.initializing=false;storageLoader.classList.add('hide');storageRenderStatus();storageBaseToast('浏览器不支持扩展存储，已使用兼容模式；请定期导出备份');return;
  }
  storageAttachDatabase(db);
  try{
    const record=await storageReadRecord(db);
    if(record){const restored=JSON.parse(record.json);if(!storageValidateState(restored))throw Error('Invalid stored state');const previous=state;state=restored;try{normalize()}catch(error){state=previous;throw error}}
    storageUseIndexedDB();
    // Commit a verified copy before considering migration complete. The legacy key is retained.
    if(!record){const json=JSON.stringify(state);await storageWriteRecord(db,json)}
    try{localStorage.setItem('phone-life-storage-backend','indexeddb-v1')}catch{}
    phoneStorage.phase='saved';phoneStorage.initializing=false;storageRestoreScreen();storageLoader.classList.add('hide');storageRenderStatus();
    if(/本地空间不足|浏览器本地存储已满/.test(el('toast').textContent))el('toast').style.display='none';
  }catch(error){
    phoneStorage.phase='blocked';phoneStorage.mode='blocked';phoneStorage.error=error?.name==='QuotaExceededError'?'浏览器没有足够的存储空间，迁移暂未完成。':error?.name==='SecurityError'?'浏览器阻止了扩展存储，请在允许保存数据的普通窗口打开。':'无法完成本机数据读取或迁移，原存储没有被清除。';window.phoneStorageWrite=()=>{storageRenderStatus();return false};window.phoneStorageBooting=false;phoneStorage.initializing=false;storageRenderStatus();storageBlockedScreen();
  }
}
window.addEventListener('beforeunload',event=>{if(phoneStorage.busy||phoneStorage.pending||phoneStorage.phase==='error'){event.preventDefault();event.returnValue=''}});
const storageBaseSettings=renderSettings;
renderSettings=()=>{storageBaseSettings();const bytes=new Blob([JSON.stringify(state)]).size;el('appContent').querySelector('h1')?.insertAdjacentHTML('afterend',`<div class="card"><strong>本机数据存储</strong><p class="muted" id="phoneStorageSettingsStatus"></p><p class="muted">当前数据约 ${(bytes/1024/1024).toFixed(2)} MB。照片、壁纸与聊天使用浏览器扩展存储，数据仍保存在本机。</p><button class="secondary-btn" onclick="exportBackup()">导出完整备份</button></div>`);storageRenderStatus()};
phoneStorage.ready=initializePhoneStorage();
