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
 if(phoneStorage.mode!=='blocked'&&applyFamilyContacts())save();
});
// Migrate this authored change once, preserving later edits and unrelated story progress.
function applyPhoneRefinements(){
 const marker='linlin-input-call-20261025-v1';if(state.appliedScenarios?.[marker])return false;
 const list=state.chats.c2||[];state.chats.c2=list.filter(m=>!['hi','好呀，下次一起','好呀，下次一起！','刚下课 你到哪了'].includes(m.text.trim()));
 const node=state.story.nodes.find(n=>n.id==='linlin-incoming-call-20261022');
 if(node){if(incomingCall?.nodeId===node.id)clearIncomingCallRuntime();node.trigger='message';node.keyword='刚下课 你到哪了';node.title='发送下课消息三秒后收到霖霖来电';node.delayMs=3000;state.story.done=state.story.done.filter(id=>id!==node.id);delete state.callFlows[node.id]}
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};return true;
}
const removedRedbook=icons.findIndex(x=>x[0]==='redbook');if(removedRedbook>=0)icons.splice(removedRedbook,1);
const removedRedbookIcon=editableIconApps.indexOf('redbook');if(removedRedbookIcon>=0)editableIconApps.splice(removedRedbookIcon,1);
const refinementOpenApp=openApp;openApp=id=>{if(id!=='redbook')refinementOpenApp(id)};
el('chatInput').addEventListener('click',event=>{
 if(event.phoneStoryHandled||isLocked()||activeGroup||activeChat!=='c2'||!state.story.enabled)return;
 const node=state.story.nodes.find(n=>!state.story.done.includes(n.id));
 if(node?.id!=='linlin-incoming-call-20261022'||node.trigger!=='message')return;
 const message={id:uid(),from:'me',text:'刚下课 你到哪了',at:Date.now()};state.chats.c2??=[];state.chats.c2.push(message);
 if(!save()){state.chats.c2.pop();return}el('chatInput').value='';renderChat();storyTrigger('message',message.text,'c2');
});
const homeGesture=document.createElement('button');homeGesture.id='homeGesture';homeGesture.className='home-gesture';homeGesture.setAttribute('aria-label','上滑返回主屏幕');homeGesture.title='向上滑动返回主屏幕';el('shell').append(homeGesture);
let homeGestureStart=null;
homeGesture.addEventListener('pointerdown',event=>{homeGestureStart={x:event.clientX,y:event.clientY};homeGesture.setPointerCapture(event.pointerId)});
homeGesture.addEventListener('pointerup',event=>{if(!homeGestureStart)return;const dy=homeGestureStart.y-event.clientY,dx=Math.abs(homeGestureStart.x-event.clientX);homeGestureStart=null;if(!isLocked()&&!incomingCall&&!el('callScreen')&&dy>24&&dx<100)homeScreen()});
homeGesture.addEventListener('pointercancel',()=>{homeGestureStart=null});
homeGesture.addEventListener('click',event=>{if(event.detail===0&&!isLocked()&&!incomingCall)homeScreen()});
