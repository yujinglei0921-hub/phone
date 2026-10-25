'use strict';
const unlockGroupStoryLines=[['弄','又有人骂我死了'],['弄','呜呜呜呜姐姐'],['黄星','没事的没事的'],['黄星','他们都是坏蛋']];
let unlockGroupStoryTimer;
function ensureUnlockGroupStory(){
 if(state.unlockGroupStory?.id==='f4-unlock-20261025-v1')return state.unlockGroupStory;
 const group=state.groups.find(group=>group.name==='垂涎F4+2');if(!group)return null;
 state.unlockGroupStory={id:'f4-unlock-20261025-v1',groupId:group.id,phase:'idle',index:0,dismissed:0,nextAt:0};
 save();return state.unlockGroupStory;
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
 clearTimeout(unlockGroupStoryTimer);el('unlockGroupNotice')?.remove();
 if(phoneStorage.mode==='blocked')return;
 const story=ensureUnlockGroupStory();if(!story||!state.story.enabled||isLocked())return;
 if(story.phase==='idle'){story.phase='waiting';story.runId=uid();story.nextAt=Date.now()+60000;save()}
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
const unlockGroupCompleteUnlock=completeUnlock;completeUnlock=()=>{unlockGroupCompleteUnlock();resumeUnlockGroupStory()};
const unlockGroupResumeCalls=resumePendingIncomingCalls;resumePendingIncomingCalls=()=>{unlockGroupResumeCalls();resumeUnlockGroupStory()};
const unlockGroupToggleLock=toggleLock;toggleLock=value=>{if(value){clearTimeout(unlockGroupStoryTimer);el('unlockGroupNotice')?.remove()}return unlockGroupToggleLock(value)};
const unlockGroupReset=resetIncomingCallFlows;resetIncomingCallFlows=()=>{
 unlockGroupReset();clearTimeout(unlockGroupStoryTimer);el('unlockGroupNotice')?.remove();delete state.unlockGroupStory;
};
document.addEventListener('phone-state-restored',resumeUnlockGroupStory);
