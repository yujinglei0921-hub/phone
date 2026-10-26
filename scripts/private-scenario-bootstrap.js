// Apply only the scenario explicitly declared by the page; full backups stay in the browser.
window.phoneScenarioReady=(async()=>{
  const scenario=JSON.parse(document.getElementById('privateScenarioData').textContent);
  await phoneStorage.ready;
  if(window.phonePublishedBackupReady)await window.phonePublishedBackupReady;
  function matches(data){if(data.appliedScenarios?.[scenario.id])return true;return (!scenario.identity.profileName||data.profile?.name===scenario.identity.profileName)&&scenario.identity.contactIds.every(id=>data.contacts?.some(c=>c.id===id))&&data.contacts?.some(c=>c.id===scenario.contactId&&c.name===scenario.contactName)}
  function panel(message=''){let node=el('privateScenarioPanel');if(!node){node=document.createElement('section');node.id='privateScenarioPanel';node.className='private-scenario-panel';el('shell').append(node)}node.innerHTML=`<strong>载入你的故事版本</strong><p>请选择你刚才上传的原始备份：<br>${esc(scenario.sourceBackupName)}</p><p>照片和已有内容会保留，新对话与来电剧情会自动加入。文件只在当前浏览器读取。</p><button onclick="document.getElementById('backupInput').click()">选择原备份</button>${message?`<p role="status" class="private-scenario-error">${esc(message)}</p>`:''}`}
  async function apply(){
    if(!matches(state))return false;
    const updates=(scenario.conversationUpdates||[]).filter(update=>!state.appliedScenarios?.[update.id]);
    const groupUpdate=scenario.groupStoryUpdate&&!state.appliedScenarios?.[scenario.groupStoryUpdate.id]?scenario.groupStoryUpdate:null;
    if(!state.appliedScenarios?.[scenario.id]||updates.length||groupUpdate){
      const previous=structuredClone(state),list=state.chats[scenario.contactId]||[];
      if(!state.appliedScenarios?.[scenario.id]){
      state.chats[scenario.contactId]=[...list,...scenario.messages.filter(m=>!list.some(old=>old.id===m.id))].sort((a,b)=>a.at-b.at);
      const existingNode=state.story.nodes.find(n=>n.id===scenario.storyNode.id);
      if(existingNode&&scenario.resetStoryNode)Object.assign(existingNode,structuredClone(scenario.storyNode));else if(!existingNode)state.story.nodes.push(structuredClone(scenario.storyNode));
      if(scenario.resetStoryNode){state.story.done=state.story.done.filter(id=>id!==scenario.storyNode.id);state.callFlows={...state.callFlows};delete state.callFlows[scenario.storyNode.id]}
      if(Array.isArray(scenario.callHistorySeed))state.callHistory=scenario.callHistorySeed.map(record=>({...record,contactId:state.contacts.find(c=>c.name===record.contactName)?.id||'',at:0,seconds:0}));
      state.story.enabled=true;state.appliedScenarios={...state.appliedScenarios,[scenario.id]:true};
      }
      for(const update of updates){
        const contact=state.contacts.find(c=>c.id===update.contactId&&c.name===update.contactName);
        const group=state.groups.find(g=>g.id===update.groupId&&g.name===update.groupName);
        if(!contact||!group){state=previous;panel('没有找到对应联系人或群组，请选择原始备份。');return false}
        state.chats[contact.id]=structuredClone(update.messages);
        group.messages=structuredClone(update.groupMessages);
        state.appliedScenarios={...state.appliedScenarios,[update.id]:true};
      }
      if(groupUpdate){
        for(const update of groupUpdate.groups){const group=state.groups.find(g=>g.id===update.id&&g.name===update.name);if(!group){state=previous;panel('没有找到对应群组，请选择原始备份。');return false}group.messages=structuredClone(update.messages)}
        state.groupChatStory=structuredClone(groupUpdate.story);
        state.appliedScenarios={...state.appliedScenarios,[groupUpdate.id]:true};
      }
      if(!save()){state=previous;panel('尚未保存，请检查存储提示后重试。');return false}
      while(phoneStorage.busy||phoneStorage.pending){if(phoneStorage.phase==='error'){panel('保存尚未完成，请先导出备份，再重试。');return false}await new Promise(resolve=>setTimeout(resolve,25))}
    }
    if(applyPhoneRefinements())save();el('privateScenarioPanel')?.remove();storageRestoreScreen();return true;
  }
  const baseImport=el('backupInput').onchange;
  el('backupInput').onchange=async event=>{
    if(el('privateScenarioPanel')){
      const file=event.target.files[0];if(!file)return;
      try{const value=JSON.parse(await file.text());if(value.format!=='phone-life-ios18'||!matches(value.data)){event.target.value='';panel('请选择对应的原始备份，当前内容没有被替换。');return}}catch{event.target.value='';panel('文件无法解析，请选择 JSON 备份。');return}
    }
    await baseImport(event);if(matches(state))await apply();
  };
  if(!await apply()&&!el('privateScenarioPanel'))panel();
})().catch(()=>{toast('故事版本暂未载入，请重新打开并选择原始 JSON 备份。')});
