'use strict';
const unlockGroupStoryLines=[['简','又有人骂我死了'],['简','呜呜呜呜姐姐'],['黄星','没事的没事的'],['黄星','他们都是坏蛋']];
const f4PrivateQuestion='你觉得啥时候能开机';
let unlockGroupStoryTimer,f4PrivateTimer;
function correctF4StorySenders(){
 const marker='f4-jian-sender-20261026-v1';if(state.appliedScenarios?.[marker])return;
 const contact=state.contacts.find(contact=>contact.name==='简');if(!contact)return;
 for(const group of state.groups)for(const message of group.messages){
  if(/-f4-[01]$/.test(message.id)&&['又有人骂我死了','呜呜呜呜姐姐'].includes(message.text)&&message.senderName==='弄'){
   message.senderId=contact.id;message.senderName=contact.name;
  }
 }
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};save();
}
function correctF4QuestionText(){
 const marker='f4-question-kai-ji-20261026-v1';if(state.appliedScenarios?.[marker])return;
 const contact=state.contacts.find(contact=>contact.name==='霖霖');if(!contact)return;
 for(const message of state.chats[contact.id]||[]){
  if(message.id?.endsWith('-f4-question')&&message.text==='你觉得啥时候能开')message.text=f4PrivateQuestion;
 }
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};save();
}
function ensureUnlockGroupStory(){
 correctF4StorySenders();correctF4QuestionText();
 if(state.unlockGroupStory?.id==='f4-open-group-20261025-v2')return state.unlockGroupStory;
 const group=state.groups.find(group=>group.name==='垂涎F4+2');if(!group)return null;
 const contact=state.contacts.find(contact=>contact.name==='霖霖');
 const cleanup='f4-private-history-cleanup-20261025-v1';
 if(contact&&!state.appliedScenarios?.[cleanup]){
  state.chats[contact.id]=(state.chats[contact.id]||[]).filter(message=>!['你觉得啥时候能开','不知道 悬'].includes(message.text.trim()));
  state.appliedScenarios={...state.appliedScenarios,[cleanup]:true};
 }
 state.unlockGroupStory={id:'f4-open-group-20261025-v2',groupId:group.id,contactId:contact?.id||'c2',phase:'idle',privatePhase:'idle',index:0,dismissed:0,nextAt:0};
 save();return state.unlockGroupStory;
}
function f4PrivateNotice(story){
 el('f4PrivateNotice')?.remove();
 if(isLocked()||story.privatePhase!=='reply'||story.privateDismissed)return;
 const notice=document.createElement('button');notice.id='f4PrivateNotice';notice.className='story-notice';
 notice.innerHTML=`<strong>微信 · 霖霖</strong>${esc(f4PrivateQuestion)}`;
 notice.onclick=()=>{story.privateDismissed=true;save();notice.remove();if(isLocked())return;openApp('messages');openChat(story.contactId)};
 el('shell').append(notice);
}
function unlockGroupNotice(story){
 el('unlockGroupNotice')?.remove();if(isLocked()||story.index<=story.dismissed)return;
 const group=wcGroup(story.groupId),line=unlockGroupStoryLines[story.index-1];if(!group||!line)return;
 const notice=document.createElement('button');notice.id='unlockGroupNotice';notice.className='story-notice';
 notice.innerHTML=`<strong>微信 · ${esc(group.name)}</strong>${esc(line[0]+'：'+line[1])}`;
 notice.onclick=()=>{story.dismissed=story.index;save();notice.remove();if(isLocked())return;openApp('messages');openGroupChat(story.groupId)};
 el('shell').append(notice);
}
function resumeUnlockGroupStory(){
 clearTimeout(unlockGroupStoryTimer);clearTimeout(f4PrivateTimer);el('unlockGroupNotice')?.remove();el('f4PrivateNotice')?.remove();
 if(phoneStorage.mode==='blocked')return;
 const story=ensureUnlockGroupStory();if(!story||!state.story.enabled||isLocked())return;
 if(story.phase==='idle')return;
 if(story.privatePhase==='waiting'){
  f4PrivateTimer=setTimeout(()=>{
   if(state.unlockGroupStory!==story||!state.story.enabled||isLocked())return;
   const list=state.chats[story.contactId]??=[],id=story.runId+'-f4-question';
   if(!list.some(message=>message.id===id))list.push({id,from:'them',text:f4PrivateQuestion,at:Date.now()});
   story.privatePhase='reply';save();
   if(currentApp==='messages'){if(activeChat===story.contactId)renderChat();else if(!activeChat&&!activeGroup)wcRenderList()}
   f4PrivateNotice(story);
  },Math.max(0,story.privateDueAt-Date.now()));
 }
 f4PrivateNotice(story);
 unlockGroupNotice(story);if(story.phase==='done')return;
 unlockGroupStoryTimer=setTimeout(()=>{
  if(state.unlockGroupStory!==story||!state.story.enabled||isLocked())return;
  const group=wcGroup(story.groupId),line=unlockGroupStoryLines[story.index];if(!group||!line)return;
  const id=story.runId+'-f4-'+story.index,contact=state.contacts.find(contact=>contact.name===line[0]);
  const message={id,from:'member',senderId:contact?.id||'',senderName:line[0],text:line[1],at:Date.now()};
  const appended=!group.messages.some(message=>message.id===id);if(appended)group.messages.push(message);
  const previous={index:story.index,phase:story.phase,nextAt:story.nextAt};
  story.index++;story.phase=story.index===unlockGroupStoryLines.length?'done':'sending';story.nextAt=story.phase==='done'?0:Date.now()+2000;
  if(!save()){Object.assign(story,previous);if(appended)group.messages.splice(group.messages.indexOf(message),1);return}
  if(currentApp==='messages'){if(activeGroup===group.id)renderChat();else if(!activeChat&&!activeGroup)wcRenderList()}
  resumeUnlockGroupStory();
 },Math.max(0,story.nextAt-Date.now()));
}
const f4OpenGroupChat=openGroupChat;openGroupChat=id=>{
 f4OpenGroupChat(id);if(isLocked()||!state.story.enabled||activeGroup!==id)return;
 const story=ensureUnlockGroupStory();if(!story||story.groupId!==id||story.phase!=='idle')return;
 story.phase='waiting';story.runId=uid();story.nextAt=Date.now()+60000;story.privatePhase='waiting';story.privateDueAt=Date.now()+5000;
 save();resumeUnlockGroupStory();
};
el('chatInput').addEventListener('click',event=>{
 const story=state.unlockGroupStory;
 if(!story||story.privatePhase!=='reply'||!state.story.enabled||isLocked()||activeGroup||activeChat!==story.contactId)return;
 event.phoneStoryHandled=true;event.preventDefault();event.stopImmediatePropagation();
 const list=state.chats[story.contactId]??=[],id=story.runId+'-f4-reply';
 if(!list.some(message=>message.id===id))list.push({id,from:'me',text:'不知道 悬',at:Date.now()});
 story.privatePhase='done';save();el('f4PrivateNotice')?.remove();el('chatInput').value='';renderChat();el('chatInput').blur();
},true);
const unlockGroupCompleteUnlock=completeUnlock;completeUnlock=()=>{unlockGroupCompleteUnlock();resumeUnlockGroupStory()};
const unlockGroupResumeCalls=resumePendingIncomingCalls;resumePendingIncomingCalls=()=>{unlockGroupResumeCalls();resumeUnlockGroupStory()};
const unlockGroupToggleLock=toggleLock;toggleLock=value=>{if(value){clearTimeout(unlockGroupStoryTimer);clearTimeout(f4PrivateTimer);el('unlockGroupNotice')?.remove();el('f4PrivateNotice')?.remove()}return unlockGroupToggleLock(value)};
const unlockGroupReset=resetIncomingCallFlows;resetIncomingCallFlows=()=>{
 unlockGroupReset();clearTimeout(unlockGroupStoryTimer);clearTimeout(f4PrivateTimer);el('unlockGroupNotice')?.remove();el('f4PrivateNotice')?.remove();delete state.unlockGroupStory;
};
document.addEventListener('phone-state-restored',resumeUnlockGroupStory);
