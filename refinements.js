'use strict';
// Add the family contacts once without replacing existing contacts or chat history.
function applyFamilyContacts(){
 const marker='family-contacts-20261025-v1';
 if(state.appliedScenarios?.[marker])return false;
 for(const [id,name] of [['family-sister','姐'],['family-mother','妈'],['family-father','爸']]){
  if(state.contacts.some(contact=>contact.name===name))continue;
  state.contacts.push({id:state.contacts.some(contact=>contact.id===id)?uid():id,name,nickname:'',bio:'',relation:'家人',avatar:'',reply:''});
 }
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};
 return true;
}
document.addEventListener('phone-state-restored',()=>{
 if(phoneStorage.mode==='blocked')return;
 const familyChanged=applyFamilyContacts(),chatChanged=applyAuthoredChatUpdate();
 if(familyChanged||chatChanged)save();
});
// Migrate this authored change once, preserving later edits and unrelated story progress.
function applyPhoneRefinements(){
 const marker='linlin-unlock-story-20261025-v2';if(state.appliedScenarios?.[marker])return false;
 const node=state.story.nodes.find(n=>n.id==='linlin-incoming-call-20261022');
 if(node){if(incomingCall?.nodeId===node.id)clearIncomingCallRuntime();node.trigger='message';node.keyword='刚下课';node.title='回复刚下课，五秒后收到霖霖来电';node.delayMs=5000;node.callFlow={...node.callFlow,retryDelayMs:3000,maxDeclines:4,rejectMessageBatches:[{after:2,messages:['你在哪','许伟健']},{after:3,messages:['怎么不接电话','你完了']}]};state.story.done=state.story.done.filter(id=>id!==node.id);delete state.callFlows[node.id]}
 clearTimeout(groupStoryTimer);el('groupStoryNotice')?.remove();
 state.groupChatStory={trigger:'unlock',contactId:node?.contact||'c2',message:'我到了',reply:'刚下课',phase:'idle'};
 state.story.enabled=true;
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};return true;
}
const removedRedbook=icons.findIndex(x=>x[0]==='redbook');if(removedRedbook>=0)icons.splice(removedRedbook,1);
const removedRedbookIcon=editableIconApps.indexOf('redbook');if(removedRedbookIcon>=0)editableIconApps.splice(removedRedbookIcon,1);
const refinementOpenApp=openApp;openApp=id=>{if(id!=='redbook')refinementOpenApp(id)};
const homeGesture=document.createElement('button');homeGesture.id='homeGesture';homeGesture.className='home-gesture';homeGesture.setAttribute('aria-label','上滑返回主屏幕');homeGesture.title='向上滑动返回主屏幕';el('shell').append(homeGesture);
let homeGestureStart=null;
homeGesture.addEventListener('pointerdown',event=>{homeGestureStart={x:event.clientX,y:event.clientY};homeGesture.setPointerCapture(event.pointerId)});
homeGesture.addEventListener('pointerup',event=>{if(!homeGestureStart)return;const dy=homeGestureStart.y-event.clientY,dx=Math.abs(homeGestureStart.x-event.clientX);homeGestureStart=null;if(!isLocked()&&!incomingCall&&!el('callScreen')&&dy>24&&dx<100)homeScreen()});
homeGesture.addEventListener('pointercancel',()=>{homeGestureStart=null});
homeGesture.addEventListener('click',event=>{if(event.detail===0&&!isLocked()&&!incomingCall)homeScreen()});
