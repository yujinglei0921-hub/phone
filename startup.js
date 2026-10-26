'use strict';
window.finishPhoneStartup=()=>{
 if(window.phoneStartupReady)return window.phoneStartupReady;
 return window.phoneStartupReady=(async()=>{
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  try{
   await phoneStorage.ready;
   await window.phonePublishedBackupReady;
   await window.phoneScenarioReady;
   await window.phonePlayerReady;
   if(phoneStorage.mode==='blocked')throw Error(phoneStorage.error||'本机数据暂时无法读取');
   toggleLock(true);
   const wallpaper=state.settings.lockWallpaper;
   if(wallpaper){
    const image=new Image();image.src=wallpaper;
    try{await image.decode()}catch{}
   }
   // Let the restored lock wallpaper reach a paint before exposing the phone.
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   document.documentElement.classList.remove('phone-starting','phone-start-error');
  }catch(error){
   document.documentElement.classList.add('phone-start-error');
   storageLoader.innerHTML='<strong>锁屏暂时无法载入</strong><p>'+esc(error.message)+'</p><button onclick="location.reload()">重新载入</button>';
   storageLoader.classList.remove('hide');
  }
 })();
};
