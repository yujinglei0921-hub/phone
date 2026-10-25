// Apply only the scenario explicitly declared by the page; full backups stay in the browser.
(async()=>{
  const scenario=JSON.parse(document.getElementById('privateScenarioData').textContent);
  await phoneStorage.ready;
  function matches(data){if(data.appliedScenarios?.[scenario.id])return true;return (!scenario.identity.profileName||data.profile?.name===scenario.identity.profileName)&&scenario.identity.contactIds.every(id=>data.contacts?.some(c=>c.id===id))&&data.contacts?.some(c=>c.id===scenario.contactId&&c.name===scenario.contactName)}
  function panel(message=''){let node=el('privateScenarioPanel');if(!node){node=document.createElement('section');node.id='privateScenarioPanel';node.className='private-scenario-panel';el('shell').append(node)}node.innerHTML=`<strong>载入你的故事版本</strong><p>请选择你刚才上传的原始备份：<br>${esc(scenario.sourceBackupName)}</p><p>照片和已有内容会保留，新对话与来电剧情会自动加入。文件只在当前浏览器读取。</p><button onclick="document.getElementById('backupInput').click()">选择原备份</button>${message?`<p role="status" class="private-scenario-error">${esc(message)}</p>`:''}`}
  async function apply(){
    if(!matches(state))return false;
    if(!state.appliedScenarios?.[scenario.id]){
      const previous=structuredClone(state),list=state.chats[scenario.contactId]||[];
      state.chats[scenario.contactId]=[...list,...scenario.messages.filter(m=>!list.some(old=>old.id===m.id))].sort((a,b)=>a.at-b.at);
      if(!state.story.nodes.some(n=>n.id===scenario.storyNode.id))state.story.nodes.push(structuredClone(scenario.storyNode));
      state.story.enabled=true;state.appliedScenarios={...state.appliedScenarios,[scenario.id]:true};
      if(!save()){state=previous;panel('尚未保存，请检查存储提示后重试。');return false}
      while(phoneStorage.busy||phoneStorage.pending){if(phoneStorage.phase==='error'){panel('保存尚未完成，请先导出备份，再重试。');return false}await new Promise(resolve=>setTimeout(resolve,25))}
    }
    el('privateScenarioPanel')?.remove();storageRestoreScreen();return true;
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
