'use strict';
let incomingCall=null,incomingCallTimer,incomingRetryTimer,incomingDialogueTimer,incomingMessageTimer; 
const incomingRingtone=new Audio('assets/wechat-ringtone.m4a');
incomingRingtone.preload='auto';incomingRingtone.loop=true;
let incomingRingtonePrimed=false;
function stopIncomingRingtone(){incomingRingtone.pause();incomingRingtone.currentTime=0;el('incomingRingtonePlay')?.remove()}
function startIncomingRingtone(){
 if(!incomingCall||incomingCall.answeredAt)return;
 const call=incomingCall;incomingRingtone.muted=false;
 incomingRingtone.play().then(()=>{if(incomingCall===call&&!call.answeredAt)el('incomingRingtonePlay')?.remove()}).catch(()=>{
  if(incomingCall!==call||call.answeredAt||el('incomingRingtonePlay'))return;
  const button=document.createElement('button');button.id='incomingRingtonePlay';button.className='secondary-btn';button.textContent='点按播放铃声';button.onclick=startIncomingRingtone;
  el('incomingCallScreen')?.append(button);
 });
}
function primeIncomingRingtone(){
 if(incomingCall){startIncomingRingtone();return}
 if(incomingRingtonePrimed)return;
 incomingRingtone.muted=true;
 incomingRingtone.play().then(()=>{
  incomingRingtonePrimed=true;
  if(!incomingCall||incomingCall.answeredAt)stopIncomingRingtone();
  incomingRingtone.muted=false;
 }).catch(()=>{incomingRingtone.muted=false});
}
document.addEventListener('pointerdown',primeIncomingRingtone,true);
document.addEventListener('keydown',primeIncomingRingtone,true);
const callFlowBaseDefaults=defaults,callFlowBaseNormalize=normalize;
defaults=()=>{const d=callFlowBaseDefaults();d.callFlows={};return d};
normalize=()=>{callFlowBaseNormalize();state.callFlows=state.callFlows&&typeof state.callFlows==='object'&&!Array.isArray(state.callFlows)?state.callFlows:{}};
normalize();
function incomingFlowConfig(nodeId){const config=state.story.nodes.find(n=>n.id===nodeId)?.callFlow;if(!config)return null;return {retryDelayMs:Math.min(60000,Math.max(1000,Number(config.retryDelayMs)||3000)),rejectMessagesAfter:Math.min(10,Math.max(1,Number(config.rejectMessagesAfter)||2)),rejectMessages:Array.isArray(config.rejectMessages)?config.rejectMessages.filter(x=>typeof x==='string'):[],dialogue:Array.isArray(config.dialogue)?config.dialogue.filter(x=>x&&typeof x.text==='string').map(x=>({speaker:x.speaker==='me'?'me':'caller',text:x.text})):[]}}
function canStartIncomingCall(nodeId=''){return !isLocked()&&!incomingCall&&!el('callScreen')&&!el('incomingCallScreen')&&!Object.values(state.callFlows).some(f=>f.nodeId!==nodeId&&['waiting','ringing','connected'].includes(f.status))}
function incomingPhoneIcon(){return '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="m13 7 8 10-5 6c3 5 5 7 10 10l6-5 10 8c-2 6-6 9-12 6C16 36 9 28 5 16 3 10 7 7 13 7Z"/></svg>'}
function showIncomingCall(contactId,options={}){
 const contact=state.contacts.find(c=>c.id===contactId),nodeId=options.nodeId||'',config=incomingFlowConfig(nodeId);if(!contact||!canStartIncomingCall(nodeId))return false;
 let flow=config?state.callFlows[nodeId]:null;
 if(config&&!flow){flow={nodeId,contactId,runId:uid(),status:'ringing',declines:0,messagesSent:false,dialogueIndex:0,nextRingAt:0};state.callFlows[nodeId]=flow}
 if(flow?.status==='completed')return false;
 if(flow){flow.status=options.connected?'connected':'ringing';flow.nextRingAt=0;save()}
 incomingCall={contactId,name:contact.name,nodeId:config?nodeId:'',startedAt:Date.now(),answeredAt:0,previousFocus:document.activeElement};
 const screen=document.createElement('section');screen.id='incomingCallScreen';screen.className='incoming-call-screen';screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.setAttribute('aria-label',contact.name+'的来电');screen.innerHTML=`<div class="incoming-call-person">${avatar(contact)}<h1>${esc(contact.name)}</h1><p id="incomingCallStatus">邀请你语音通话</p><span class="incoming-call-service">微信语音通话</span></div><div id="incomingDialogue" class="incoming-dialogue hide"></div><div id="incomingCallActions" class="incoming-call-actions"><div><button class="incoming-call-button decline" aria-label="挂断来电" onclick="finishIncomingCall('declined')">${incomingPhoneIcon()}</button><span>挂断</span></div><div><button class="incoming-call-button answer" aria-label="接听来电" onclick="answerIncomingCall()">${incomingPhoneIcon()}</button><span>接听</span></div></div><p class="incoming-call-footnote">剧情模拟通话</p>`;
 el('shell').append(screen);el('shell').classList.add('incoming-call-active');screen.querySelector('.answer').focus();if(options.connected)answerIncomingCall(true);else startIncomingRingtone();return true;
}
function answerIncomingCall(resuming=false){
 if(!incomingCall||incomingCall.answeredAt)return;stopIncomingRingtone();clearTimeout(incomingRetryTimer);const flow=state.callFlows[incomingCall.nodeId];incomingCall.answeredAt=resuming&&flow?.answeredAt?flow.answeredAt:Date.now();if(flow){flow.status='connected';flow.answeredAt=incomingCall.answeredAt;if(!resuming)flow.dialogueIndex=0;save()}
 el('incomingCallStatus').textContent='00:00';el('incomingCallActions').classList.add('connected');el('incomingCallActions').innerHTML=`<div><button class="incoming-call-button decline" aria-label="结束来电通话" onclick="finishIncomingCall('answered')">${incomingPhoneIcon()}</button><span>结束通话</span></div>`;el('incomingCallActions').querySelector('button').focus();incomingCallTimer=setInterval(()=>{if(!incomingCall)return;const seconds=Math.floor((Date.now()-incomingCall.answeredAt)/1000);el('incomingCallStatus').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')},250);renderIncomingDialogue();
}
function renderIncomingDialogue(){
 clearTimeout(incomingDialogueTimer);if(!incomingCall?.answeredAt)return;const config=incomingFlowConfig(incomingCall.nodeId),flow=state.callFlows[incomingCall.nodeId],box=el('incomingDialogue');if(!config?.dialogue.length||!flow){box.classList.add('hide');return}
 const index=Math.min(config.dialogue.length-1,Math.max(0,Number(flow.dialogueIndex)||0)),line=config.dialogue[index];box.classList.remove('hide');box.innerHTML=`<p class="incoming-dialogue-line" aria-live="polite">${esc(line.speaker==='caller'?incomingCall.name+'：'+line.text:line.text)}</p><button class="incoming-dialogue-next" aria-label="通话对话下一句" onclick="advanceIncomingDialogue()" ${index>=config.dialogue.length-1?'disabled':''}>${index>=config.dialogue.length-1?'最后一句':'下一句 ›'}</button>`;
 if(index<config.dialogue.length-1)incomingDialogueTimer=setTimeout(advanceIncomingDialogue,3000);
}
function advanceIncomingDialogue(){if(!incomingCall?.answeredAt)return;const config=incomingFlowConfig(incomingCall.nodeId),flow=state.callFlows[incomingCall.nodeId];if(!config||!flow||flow.dialogueIndex>=config.dialogue.length-1)return;flow.dialogueIndex++;save();renderIncomingDialogue()}
function addDeclineMessages(flow,config){
 if(flow.messagesSent||flow.declines<config.rejectMessagesAfter)return;
 if(!flow.messageQueue){flow.messageQueue={index:0,nextAt:Date.now()+1000};save()}
 resumeDeclineMessages();
}
function resumeDeclineMessages(){
 clearTimeout(incomingMessageTimer);if(!state.story.enabled)return;
 const flow=Object.values(state.callFlows).find(f=>f.messageQueue&&!f.messagesSent&&incomingFlowConfig(f.nodeId));if(!flow)return;
 const queue=flow.messageQueue,config=incomingFlowConfig(flow.nodeId);
 incomingMessageTimer=setTimeout(()=>{
  if(!state.story.enabled||state.callFlows[flow.nodeId]!==flow)return;
  const i=queue.index,id=flow.runId+'-decline-'+i,list=state.chats[flow.contactId]??=[];
  if(i<config.rejectMessages.length&&!list.some(m=>m.id===id))list.push({id,from:'them',text:config.rejectMessages[i],at:Date.now()});
  queue.index++;queue.nextAt=Date.now()+1000;flow.messagesSent=queue.index>=config.rejectMessages.length;save();
  if(currentApp==='messages'){if(activeChat===flow.contactId)renderChat();else if(wcTab==='chats'&&!el('chatView').classList.contains('active'))wcRenderList()}
  resumeDeclineMessages();
 },Math.max(0,queue.nextAt-Date.now()));
}
function finishIncomingCall(status){
 if(!incomingCall)return;stopIncomingRingtone();clearInterval(incomingCallTimer);clearTimeout(incomingDialogueTimer);const call=incomingCall,flow=state.callFlows[call.nodeId],config=incomingFlowConfig(call.nodeId);incomingCall=null;
 const seconds=call.answeredAt?Math.max(0,Math.floor((Date.now()-call.answeredAt)/1000)):0;state.callHistory.unshift({id:uid(),number:call.name,contactName:call.name,contactId:call.contactId,type:'incoming',status,at:call.startedAt,seconds});state.callHistory=state.callHistory.slice(0,100);
 if(flow&&config){if(call.answeredAt||status==='answered'){flow.status='completed';flow.nextRingAt=0}else{flow.declines++;flow.status='waiting';flow.nextRingAt=Date.now()+config.retryDelayMs;addDeclineMessages(flow,config)}}
 save();el('incomingCallScreen')?.remove();el('shell').classList.remove('incoming-call-active');if(call.previousFocus?.isConnected)call.previousFocus.focus();if(flow?.status==='waiting')resumePendingIncomingCalls();
}
function resumePendingIncomingCalls(){
 resumeDeclineMessages();clearTimeout(incomingRetryTimer);if(!state.story.enabled||incomingCall)return;
 const flow=Object.values(state.callFlows).find(f=>['waiting','ringing','connected'].includes(f.status)&&incomingFlowConfig(f.nodeId)&&state.contacts.some(c=>c.id===f.contactId));if(!flow)return;
 const attempt=()=>{if(!state.story.enabled||state.callFlows[flow.nodeId]!==flow)return;if(!canStartIncomingCall(flow.nodeId)){incomingRetryTimer=setTimeout(attempt,300);return}showIncomingCall(flow.contactId,{nodeId:flow.nodeId,connected:flow.status==='connected'})};
 incomingRetryTimer=setTimeout(attempt,flow.status==='waiting'?Math.max(0,(flow.nextRingAt||Date.now())-Date.now()):0);
}
function clearIncomingCallRuntime(){stopIncomingRingtone();clearTimeout(incomingMessageTimer);clearTimeout(incomingRetryTimer);clearTimeout(incomingDialogueTimer);clearInterval(incomingCallTimer);incomingCall=null;el('incomingCallScreen')?.remove();el('shell').classList.remove('incoming-call-active')}
function resetIncomingCallFlows(){clearIncomingCallRuntime();state.callFlows={}}
const callFlowBaseImport=el('backupInput').onchange;el('backupInput').onchange=async event=>{const previous=state;await callFlowBaseImport(event);if(state!==previous){clearIncomingCallRuntime();resumePendingIncomingCalls()}};
document.addEventListener('phone-state-restored',resumePendingIncomingCalls);
document.addEventListener('keydown',event=>{if(!incomingCall)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation()}if(event.key==='Tab'){const controls=[...el('incomingCallScreen').querySelectorAll('button:not(:disabled)')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}},true);
function callHistoryLabel(call){if(call.status==='missed')return '未接';if(call.status==='declined')return '已挂断';return call.type==='incoming'?'接通':'拨出'}
renderCalls=()=>{nav('通话记录');el('appContent').innerHTML=`<h1 class="bigtitle">最近通话</h1><div class="card call-history-card">${state.callHistory.map((c,i)=>`<button class="item call-history-row ${c.status==='missed'?'missed':''}" onclick="selectCallHistory(${i})"><span class="call-history-direction">${c.type==='incoming'?'↙':'↗'}</span><span class="grow"><strong>${esc(c.contactName||c.number)}<span class="call-history-label">（${callHistoryLabel(c)}）</span></strong>${c.showTime===false?'':`<p>${esc(new Date(c.at).toLocaleString('zh-CN'))} · ${c.seconds||0} 秒</p>`}</span><span class="chev">ⓘ</span></button>`).join('')||'<p class="muted">暂无模拟通话</p>'}</div><button class="secondary-btn" onclick="renderPhone()">返回拨号</button>`};
function selectCallHistory(index){const call=state.callHistory[index];if(!call)return;if(call.type==='incoming'&&state.contacts.some(c=>c.id===call.contactId)){openApp('messages');openChat(call.contactId)}else{dialNumber=String(call.number||'');renderPhone()}}

function startStoryIncomingCall(node){
 if(Number(node.delayMs)>0){state.callFlows[node.id]={nodeId:node.id,contactId:node.contact,runId:uid(),status:'waiting',declines:0,messagesSent:false,dialogueIndex:0,nextRingAt:Date.now()+Math.min(60000,Number(node.delayMs))};save();resumePendingIncomingCalls()}
 else showIncomingCall(node.contact,{nodeId:node.id});
}
