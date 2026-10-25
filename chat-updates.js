'use strict';
function applyAuthoredChatUpdate(){
 const marker='authored-chat-history-20261025-v1';
 if(state.appliedScenarios?.[marker])return false;
 for(const [name,replies] of Object.entries(authoredChatUpdate.replies)){
  const contact=state.contacts.find(c=>c.name===name);if(contact)contact.reply=replies.join('|');
 }
 for(const [sessionIndex,[name,date,time,messages]] of authoredChatUpdate.sessions.entries()){
  const contact=state.contacts.find(c=>c.name===name);if(!contact)continue;
  const list=state.chats[contact.id]??=[];
  const start=new Date(date+'T'+(time||'12:00')+':00').getTime();
  for(const [index,[from,text]] of messages.entries()){
   const id=marker+'-'+sessionIndex+'-'+index;
   if(!list.some(message=>message.id===id))list.push({id,from,text,at:start+index*1000,showTimestamp:index===0,dateOnly:!time});
  }
  list.sort((a,b)=>(Number(a.at)||0)-(Number(b.at)||0));
 }
 state.settings.autoReply=true;
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};
 return true;
}
function scheduleContactAutoReply(id){
 if(!state.settings.autoReply)return;
 const originalState=state;
 const timer=setTimeout(()=>{
  if(state!==originalState||!state.settings.autoReply)return;
  const contact=state.contacts.find(c=>c.id===id);if(!contact)return;
  const choices=(contact.reply||'收到啦！|我在听～').split('|').map(text=>text.trim()).filter(Boolean);if(!choices.length)return;
  const list=state.chats[id]??=[],message={id:uid(),from:'them',text:choices[Math.floor(Math.random()*choices.length)],at:Date.now()};
  list.push(message);if(!save()){list.pop();return}
  if(activeChat===id)renderChat();else if(currentApp==='messages'&&!activeChat&&!activeGroup)wcRenderList();
 },900+Math.random()*800);
 replyTimers.push(timer);
}
const authoredChatUpdate={"replies":{"霖霖":["许伟健你干嘛","宝贝在干嘛","呼叫小斗"],"黄星":["嗨嗨","喵～"],"邱鼎杰":["夯爆了","Yes sir"],"弄":["乖"],"简":["姐姐～姐姐～亲亲～～"]},"sessions":[["姐","2026-10-20",null,[["them","我要去看演唱会"],["me","有什么好看的"],["them","谁要看你 我要去看你老婆"],["me","行吧 确实好看"]]],["爸","2026-10-01",null,[["me","还有半小时到家"],["them","好 不着急"]]],["爸","2026-10-03",null,[["them","回家的时候去买市场买条鱼"],["me","好"]]],["妈","2026-10-08",null,[["them","到了吗"],["me","到了"],["them","在包里给沛恩带了我做的菜 记得给他吃"],["them","还有给他的特产"],["me","知道了妈 我是假儿子吗。"]]],["霖霖","2025-12-25",null,[["them","圣诞快乐呀许伟健先生"],["me","你说过了"],["them","那是说给很多人听的"],["them","现在是说给你听的"],["me","好 你也圣诞快乐 李全霖先生"]]],["霖霖","2026-02-14","13:20",[["me","你到家了吗"]]],["霖霖","2026-02-14","13:32",[["them","到了"],["me","好想你 这个情人节也太是时候"],["them","不是提前过过了"],["me","那也很想"]]],["霖霖","2026-02-16","19:20",[["them","你吃饭了吗"]]],["霖霖","2026-02-16","19:25",[["them","你在干嘛"],["them","快回我ocean"],["them","许伟健。"]]],["霖霖","2026-02-16","19:29",[["them","我要看乐乐"]]],["霖霖","2026-02-16","19:50",[["me","宝贝我刚刚没看手机"],["me","在和长辈聊天"],["me","让乐乐给你打视频"]]]]};
