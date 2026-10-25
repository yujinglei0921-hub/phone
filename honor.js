'use strict';
const honorLaunchVideo='assets/honor-launch.mp4';
if(!icons.some(icon=>icon[0]==='honor'))icons.push(['honor','王者荣耀','','linear-gradient(145deg,#f8dc8b,#b67a23 50%,#47351e)']);
art.honor=svg('<path d="M6 13l8 6 10-12 10 12 8-6-5 23H11Z" fill="#f8dda0" stroke="#573a14" stroke-width="2"/><path d="M16 26h16M24 22v15M14 36h20" stroke="#573a14" stroke-width="3"/>');
let honorVideo=null;
function honorCleanup(){
 if(honorVideo){honorVideo.pause();honorVideo.removeAttribute('src');honorVideo.load();honorVideo=null}
 el('appScreen').classList.remove('honor-mode');
}
function honorSyncSound(){const button=el('honorSound');if(button&&honorVideo){button.textContent=honorVideo.muted?'开启声音':'关闭声音';button.setAttribute('aria-pressed',String(!honorVideo.muted))}}
async function honorPlay(){
 const video=honorVideo;if(!video)return;
 el('honorResume').hidden=true;
 try{await video.play()}catch{
  if(honorVideo!==video)return;
  video.muted=true;honorSyncSound();
  try{await video.play()}catch{if(honorVideo===video)el('honorResume').hidden=false}
 }
}
function honorToggleSound(){if(!honorVideo)return;honorVideo.muted=!honorVideo.muted;honorSyncSound();if(honorVideo.paused&&!honorVideo.ended)honorPlay()}
function honorReplay(){if(!honorVideo)return;honorVideo.currentTime=0;el('honorReplay').hidden=true;honorPlay()}
function renderHonor(){
 honorCleanup();audio.pause();el('appScreen').classList.add('honor-mode');
 el('appContent').innerHTML=`<section class="honor-stage" aria-label="王者荣耀启动画面"><video id="honorVideo" playsinline webkit-playsinline preload="auto" src="${honorLaunchVideo}"></video><div class="honor-controls"><button id="honorSound" onclick="honorToggleSound()" aria-pressed="true">关闭声音</button><button id="honorReplay" onclick="honorReplay()" hidden>重新打开</button></div><button id="honorResume" class="honor-resume" onclick="honorPlay()" hidden>点按继续播放</button></section>`;
 const video=honorVideo=el('honorVideo');
 video.addEventListener('ended',()=>{if(honorVideo===video)el('honorReplay').hidden=false});
 video.addEventListener('error',()=>{if(honorVideo===video){el('honorResume').textContent='视频载入失败，点按重试';el('honorResume').hidden=false}});
 honorPlay();
}
const honorRenderApp=renderApp;renderApp=()=>{if(currentApp==='honor')return renderHonor();honorCleanup();return honorRenderApp()};
const honorHomeScreen=homeScreen;homeScreen=()=>{honorCleanup();return honorHomeScreen()};
const honorToggleLock=toggleLock;toggleLock=value=>{if(value)honorCleanup();return honorToggleLock(value)};
const honorShowIncomingCall=showIncomingCall;showIncomingCall=(...args)=>{const shown=honorShowIncomingCall(...args);if(shown&&honorVideo)honorVideo.pause();return shown};
const honorFinishIncomingCall=finishIncomingCall;finishIncomingCall=(...args)=>{const result=honorFinishIncomingCall(...args);if(honorVideo&&currentApp==='honor'&&!honorVideo.ended&&!document.hidden)honorPlay();return result};
document.addEventListener('phone-state-restored',honorCleanup);
document.addEventListener('visibilitychange',()=>{if(!honorVideo)return;if(document.hidden)honorVideo.pause();else if(currentApp==='honor'&&!isLocked()&&!incomingCall&&!honorVideo.ended)honorPlay()});
