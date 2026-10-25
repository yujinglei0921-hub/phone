'use strict';
const phoneMotionReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let phoneMotionAnimation=null,phoneMotionExit=null,phoneMotionDrag=null,phoneMotionOrigin=null;
const phoneMotionEase='cubic-bezier(.22,.8,.2,1)';
function phoneMotionAllowed(){return !isLocked()&&!incomingCall&&!el('callScreen')&&el('appScreen').classList.contains('active')}
function phoneMotionClear(){
 phoneMotionAnimation?.cancel();phoneMotionAnimation=null;phoneMotionExit=null;phoneMotionDrag=null;
 const screen=el('appScreen');for(const key of ['transform','opacity','borderRadius','willChange','pointerEvents'])screen.style[key]='';
 el('shell').classList.remove('app-moving');
}
function phoneMotionIcon(id){
 const icon=[...el('shell').querySelectorAll('.app')].find(node=>node.getAttribute('onclick')?.includes("'"+id+"'"));
 const rect=icon?.querySelector('.app-icon')?.getBoundingClientRect();
 return rect?{x:rect.x+rect.width/2,y:rect.y+rect.height/2}:null;
}
function phoneMotionSmall(){
 const rect=el('appScreen').getBoundingClientRect(),point=phoneMotionOrigin||{x:rect.x+rect.width/2,y:rect.bottom-55};
 return `translate3d(${point.x-rect.x-rect.width/2}px,${point.y-rect.y-rect.height/2}px,0) scale(.12)`;
}
function phoneMotionRun(frames,duration,done){
 const screen=el('appScreen');screen.style.willChange='transform, opacity';el('shell').classList.add('app-moving');
 const animation=screen.animate(frames,{duration:phoneMotionReduced.matches?1:duration,easing:phoneMotionEase,fill:'both'});
 phoneMotionAnimation=animation;
 animation.finished.then(()=>{if(phoneMotionAnimation!==animation)return;phoneMotionClear();done?.()}).catch(()=>{});
}
const motionOpenApp=openApp;
openApp=id=>{
 if(isLocked())return;
 const wasOpen=el('appScreen').classList.contains('active'),interrupted=!!phoneMotionExit;
 phoneMotionClear();phoneMotionOrigin=phoneMotionIcon(id);const result=motionOpenApp(id);
 if(el('appScreen').classList.contains('active')&&currentApp===id&&(!wasOpen||interrupted)){
  phoneMotionRun(phoneMotionReduced.matches?[{opacity:.6},{opacity:1}]:[
   {transform:phoneMotionSmall(),opacity:.2,borderRadius:'48px'},
   {transform:'translate3d(0,0,0) scale(1)',opacity:1,borderRadius:'0px'}
  ],420);
 }
 return result;
};
const motionHomeScreen=homeScreen;
homeScreen=()=>{
 if(!phoneMotionAllowed()){if(!isLocked()){phoneMotionClear();return motionHomeScreen()}return}
 if(phoneMotionExit)return;
 const screen=el('appScreen'),start={transform:screen.style.transform||getComputedStyle(screen).transform,opacity:screen.style.opacity||1,borderRadius:screen.style.borderRadius||'0px'};
 phoneMotionAnimation?.cancel();phoneMotionAnimation=null;phoneMotionDrag=null;
 phoneMotionExit=true;screen.style.pointerEvents='none';
 phoneMotionRun(phoneMotionReduced.matches?[{opacity:1},{opacity:0}]:[start,{transform:phoneMotionSmall(),opacity:0,borderRadius:'48px'}],330,motionHomeScreen);
};
homeGesture.addEventListener('pointerdown',event=>{
 if(!phoneMotionAllowed()||phoneMotionExit||!event.isPrimary)return;
 phoneMotionClear();phoneMotionDrag={id:event.pointerId,x:event.clientX,y:event.clientY,lastY:event.clientY,lastAt:performance.now(),velocity:0,distance:0};
 el('appScreen').style.willChange='transform, opacity';homeGesture.setPointerCapture(event.pointerId);
});
homeGesture.addEventListener('pointermove',event=>{
 const drag=phoneMotionDrag;if(!drag||drag.id!==event.pointerId)return;
 if(!phoneMotionAllowed()){phoneMotionClear();return}
 const now=performance.now();drag.velocity=(drag.lastY-event.clientY)/Math.max(1,now-drag.lastAt);drag.lastY=event.clientY;drag.lastAt=now;
 drag.distance=Math.max(0,drag.y-event.clientY);
 const progress=Math.min(.85,drag.distance/el('shell').clientHeight),screen=el('appScreen');
 if(!phoneMotionReduced.matches){screen.style.transform=`translate3d(${(event.clientX-drag.x)*.16}px,${-drag.distance*.45}px,0) scale(${1-progress*.48})`;screen.style.borderRadius=Math.min(32,progress*120)+'px';screen.style.opacity=1}
});
function phoneMotionRelease(event,cancelled=false){
 const drag=phoneMotionDrag;if(!drag||drag.id!==event.pointerId)return;
 const fresh=performance.now()-drag.lastAt<100,exit=!cancelled&&phoneMotionAllowed()&&Math.abs(event.clientX-drag.x)<150&&(drag.distance>70||(drag.distance>24&&fresh&&drag.velocity>.45));
 phoneMotionDrag=null;
 if(exit){homeScreen();return}
 const screen=el('appScreen');phoneMotionRun([{transform:screen.style.transform||'none',opacity:screen.style.opacity||1,borderRadius:screen.style.borderRadius||'0px'},{transform:'translate3d(0,0,0) scale(1)',opacity:1,borderRadius:'0px'}],260);
}
homeGesture.addEventListener('pointerup',event=>phoneMotionRelease(event));
homeGesture.addEventListener('pointercancel',event=>phoneMotionRelease(event,true));
homeGesture.addEventListener('lostpointercapture',event=>{if(phoneMotionDrag)phoneMotionRelease(event,true)});
homeGesture.addEventListener('click',event=>{if(event.detail===0&&phoneMotionAllowed())homeScreen()});
document.addEventListener('phone-state-restored',phoneMotionClear);
const motionToggleLock=toggleLock;toggleLock=value=>{if(value)phoneMotionClear();return motionToggleLock(value)};
const motionShowIncomingCall=showIncomingCall;showIncomingCall=(...args)=>{phoneMotionClear();return motionShowIncomingCall(...args)};
document.addEventListener('visibilitychange',()=>{if(document.hidden){const closing=phoneMotionExit;phoneMotionClear();if(closing&&!isLocked())motionHomeScreen()}});
