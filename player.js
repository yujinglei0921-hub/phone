'use strict';
document.documentElement.classList.add('player-mode');
const playerBlocked=/^(?:edit(?!Note\b)|delete|new[A-Z]|addContact|addNote|manageSingle|manageGroupMessages|renderSettings|renderPersonalize|renderIconSettings|editWeather|renderStory|renderProfile|renderAbout|toggleWeChatMenu|toggleNotesMenu|restoreWall|clearBaiduHistory|exportBackup|importBackup|resetApp|upload)/;
function playerClean(){
 for(const node of document.querySelectorAll('[onclick]')){
  const action=node.getAttribute('onclick').trim();
  if(node.classList.contains('bubble')){node.removeAttribute('onclick');node.removeAttribute('title');node.setAttribute('aria-label',node.textContent);continue}
  if(playerBlocked.test(action)||/^editNote\(\)/.test(action))node.classList.add('player-hidden');
 }
 for(const input of document.querySelectorAll('input[type=file]'))input.closest('label')?.classList.add('player-hidden');
 for(const select of document.querySelectorAll('#appContent select'))(select.closest('.card')||select).classList.add('player-hidden');
 for(const node of document.querySelectorAll('input[type=file],.nt-compose,.nt-editor-more,.nt-add-photo,.nt-date-control,#navAction,.camera-picker'))node.classList.add('player-hidden');
}
document.addEventListener('click',event=>{const node=event.target.closest('[onclick]');if(node&&playerBlocked.test(node.getAttribute('onclick').trim())){event.preventDefault();event.stopImmediatePropagation()}},true);
const playerApp=openApp;openApp=id=>{if(['settings','story','profile','about'].includes(id))return;playerApp(id)};
editContact=id=>{if(state.contacts.some(c=>c.id===id)){openApp('messages');openChat(id)}};
// Keep contacts navigable while removing their authoring action.
playerBlocked.lastIndex=0;
const playerContactRows=contactRows;contactRows=cs=>playerContactRows(cs).replaceAll('editContact(', 'playerViewContact(');
function playerViewContact(id){openApp('messages');openChat(id)}
const playerWcContacts=wcRenderContacts;wcRenderContacts=()=>{playerWcContacts();for(const n of el('appContent').querySelectorAll('[onclick^="editContact("]'))n.setAttribute('onclick','playerViewContact(this.dataset.id)')};
manageGroups=()=>{el('appContent').innerHTML=wcSubHeader('群聊')+state.groups.map(g=>`<button class="wc-contact-row" data-id="${esc(g.id)}" onclick="openGroupChat(this.dataset.id)">${wcGroupAvatar(g)}<span>${esc(g.name)}</span></button>`).join('');wcMount()};
editNote=id=>{const note=state.noteEntries.find(n=>n.id===id);if(!note)return;ntDraft=null;clearTimeout(ntSaveTimer);ntMount();el('notesToolbar')?.remove();el('appContent').innerHTML=`<header class="nt-editor-header"><button class="nt-back-list" onclick="renderNotes()">‹ 备忘录</button></header><article class="nt-editor"><h1>${esc(note.title)}</h1><div style="white-space:pre-wrap;line-height:1.7">${esc(note.body)}</div>${note.images.map(img=>`<img src="${esc(img.data)}" alt="备忘录配图" style="max-width:100%;border-radius:12px;margin-top:16px">`).join('')}</article>`};
function playerRestart(){if(!confirm('重新开始游玩？本次游玩进度将清除。'))return;clearIncomingCallRuntime();clearTimeout(groupStoryTimer);el('groupStoryNotice')?.remove();state=structuredClone(JSON.parse(el('publishedBackupData').textContent).data);normalize();applyPhoneRefinements();state.settings.locked=true;state.appliedScenarios={...state.appliedScenarios,'published-backup-20261025-170805':true};save();storageRestoreScreen()}
new MutationObserver(playerClean).observe(el('shell'),{childList:true,subtree:true});
(async()=>{await phonePublishedBackupReady;if(applyPhoneRefinements())save();toggleLock(true);document.documentElement.classList.add('player-ready');const button=document.createElement('button');button.className='player-restart';button.textContent='重新开始';button.onclick=playerRestart;document.body.append(button);playerClean()})();
