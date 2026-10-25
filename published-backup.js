// The user-provided published snapshot is applied once per release, after local storage restores.
window.phonePublishedBackupReady=(async()=>{
 await phoneStorage.ready;
 const node=document.getElementById('publishedBackupData');if(!node)return;
 const backup=JSON.parse(node.textContent),release='published-backup-20261025-upload2';
 if(state.appliedScenarios?.[release]){toggleLock(true);return;}
 if(phoneStorage.mode==='blocked')throw Error('本机存储尚未就绪');
 if(backup.format!=='phone-life-ios18'||!storageValidateState(backup.data))throw Error('备份格式不正确');
 const previous=state;
 // Keep the previous local version recoverable before replacing it with the requested release.
 if(phoneStorage.db)await new Promise((resolve,reject)=>{const tx=phoneStorage.db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put({json:JSON.stringify(previous),format:1,savedAt:Date.now()},'before-'+release);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
 clearIncomingCallRuntime();clearTimeout(groupStoryTimer);el('groupStoryNotice')?.remove();
 state=structuredClone(backup.data);normalize();state.appliedScenarios={...state.appliedScenarios,[release]:true};
 if(!save()){state=previous;throw Error('最新备份未能保存')}
 while(phoneStorage.busy||phoneStorage.pending){if(phoneStorage.phase==='error')throw Error('最新备份尚未保存完成');await new Promise(resolve=>setTimeout(resolve,25))}
 toggleLock(true);storageRestoreScreen();
})().catch(error=>{toast(error.message);throw error});
