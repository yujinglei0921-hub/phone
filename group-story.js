'use strict';
let groupStoryTimer;
const groupStoryDefaults=defaults,groupStoryNormalize=normalize;
defaults=()=>{const d=groupStoryDefaults();d.groupChatStory=null;return d};
normalize=()=>{groupStoryNormalize();state.groupChatStory=state.groupChatStory&&typeof state.groupChatStory==='object'?state.groupChatStory:null};
normalize();
function groupStoryNotice(){
 const story=state.groupChatStory;if(!story||story.phase!=='reply')return;
 document.getElementById('groupStoryNotice')?.remove();
 const notice=document.createElement('button');notice.id='groupStoryNotice';notice.className='story-notice';
 notice.innerHTML=`<strong>微信 · ${esc(state.contacts.find(c=>c.id===story.contactId)?.name||'霖霖')}</strong>${esc(story.message)}`;
 notice.onclick=()=>{notice.remove();if(isLocked())return;openApp('messages');openChat(story.contactId)};el('shell').append(notice);
}
function resumeGroupStory(){
 clearTimeout(groupStoryTimer);el('groupStoryNotice')?.remove();const story=state.groupChatStory;if(!story||!state.story.enabled)return;
 if(story.trigger==='unlock'&&story.phase==='idle'&&!isLocked()){
  story.phase='waiting';story.runId=uid();story.dueAt=Date.now()+15000;save();
 }
 if(story.phase==='reply'){groupStoryNotice();return}
 if(story.phase!=='waiting')return;
 groupStoryTimer=setTimeout(()=>{
  if(state.groupChatStory!==story||!state.story.enabled)return;
  if(isLocked()){groupStoryTimer=setTimeout(resumeGroupStory,300);return}
  const list=state.chats[story.contactId]??=[],id=story.runId+'-question';
  if(!list.some(m=>m.id===id))list.push({id,from:'them',text:story.message,at:Date.now()});
  story.phase='reply';save();
  if(currentApp==='messages'&&activeChat===story.contactId)renderChat();
  else if(currentApp==='messages'&&!activeChat&&!activeGroup)wcRenderList();
  groupStoryNotice();
 },Math.max(0,story.dueAt-Date.now()));
}
const groupStoryOpen=openGroupChat;
openGroupChat=id=>{groupStoryOpen(id);const story=state.groupChatStory;if(story&&story.trigger!=='unlock'&&state.story.enabled&&activeGroup===id&&story.groupId===id&&story.phase==='idle'){story.phase='waiting';story.runId=uid();story.dueAt=Date.now()+5000;save();resumeGroupStory()}};
const groupStoryUnlock=completeUnlock;
completeUnlock=()=>{groupStoryUnlock();resumeGroupStory()};
el('chatInput').addEventListener('click',event=>{
 const story=state.groupChatStory;if(!story||story.phase!=='reply'||!state.story.enabled||activeChat!==story.contactId||activeGroup||isLocked())return;
 event.phoneStoryHandled=true;event.preventDefault();const list=state.chats[story.contactId]??=[],id=story.runId+'-reply';
 if(!list.some(m=>m.id===id))list.push({id,from:'me',text:story.reply,at:Date.now()});
 story.phase='done';save();el('groupStoryNotice')?.remove();renderChat();el('chatInput').blur();
 if(story.trigger==='unlock'){storyTrigger('message',story.reply,story.contactId)}
});
const groupStoryReset=resetIncomingCallFlows;
resetIncomingCallFlows=()=>{groupStoryReset();clearTimeout(groupStoryTimer);el('groupStoryNotice')?.remove();if(state.groupChatStory){state.groupChatStory.phase='idle';delete state.groupChatStory.dueAt;delete state.groupChatStory.runId}};
const groupStoryResumeCalls=resumePendingIncomingCalls;
resumePendingIncomingCalls=()=>{groupStoryResumeCalls();resumeGroupStory()};
document.addEventListener('phone-state-restored',resumeGroupStory);
