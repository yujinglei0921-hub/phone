'use strict';
const spotifySongs=['热恋夏季','恋人未满','情非得已','氧化氢','晚风定义','海与天','我们能不能不分手','樱花草'];
const spotifyArtwork={
 '氧化氢':'assets/spotify-covers/yanghuaqing.webp',
 '晚风定义':'assets/spotify-covers/wanfeng-dingyi.webp',
 '樱花草':'assets/spotify-covers/yinghuacao.jpg',
 '恋人未满':'assets/spotify-covers/lianren-weiman.jpg',
 '情非得已':'assets/spotify-covers/qingfei-deyi.jpg',
 '海与天':'assets/spotify-covers/hai-yu-tian.jpg',
 '我们能不能不分手':'assets/spotify-covers/women-nengbuneng-bufenshou.jpg',
 '热恋夏季':'assets/spotify-covers/relian-xiaji.jpg'
};
const spotifySummerAudio='assets/relian-xiaji.mp3';
const spotifySummerPath=['assets','relian-xiaji.mp3'].join('/');
function spotifyTrackSource(track){return track?.url===spotifySummerPath?spotifySummerAudio:track?.url||''}
function applySpotifySummerAudio(){
 const marker='spotify-summer-audio-20261025-v1';if(state.appliedScenarios?.[marker])return false;
 const track=state.tracks.find(track=>track.title==='热恋夏季');if(!track)return false;
 track.url=spotifySummerPath;state.appliedScenarios={...state.appliedScenarios,[marker]:true};return true;
}
let spotifyQuery='',spotifySort='default',spotifyFilter='全部',spotifyShuffle=false;
function applySpotifyPlaylist(){
 const marker='spotify-liked-songs-20261025-v1';if(state.appliedScenarios?.[marker])return false;
 state.spotifyPreviousTracks??=structuredClone(state.tracks);
 state.tracks=spotifySongs.map((title,index)=>({id:'spotify-liked-'+index,title,artist:index<5?'江衡、李沛恩':'',url:state.tracks.find(track=>track.title===title)?.url||'',mood:index<5?'Pop':'放松'}));
 state.appliedScenarios={...state.appliedScenarios,[marker]:true};activeTrack=0;audio.pause();audio.removeAttribute('src');return true;
}
document.addEventListener('phone-state-restored',()=>{if(phoneStorage.mode==='blocked')return;const playlistChanged=applySpotifyPlaylist(),audioChanged=applySpotifySummerAudio();if(playlistChanged||audioChanged)save()});
function spotifyIsPlayer(){return document.documentElement.classList.contains('player-mode')}
function spotifyCover(track,index,small=false){const artwork=spotifyArtwork[track?.title];return `<span class="sp-cover sp-cover-${index%4} ${small?'sp-cover-small':''}" aria-hidden="true">${artwork?`<img src="${esc(artwork)}" alt="" decoding="async">`:`<span>♫</span><b>${esc(track?.title?.slice(0,2)||'音乐')}</b>`}</span>`}
function spotifyRows(){
 let tracks=state.tracks.map((track,index)=>({track,index})).filter(({track})=>(!spotifyQuery||[track.title,track.artist].join(' ').toLowerCase().includes(spotifyQuery.toLowerCase()))&&(spotifyFilter==='全部'||track.mood===spotifyFilter));
 if(spotifySort==='title')tracks.sort((a,b)=>a.track.title.localeCompare(b.track.title,'zh-CN'));
 if(spotifySort==='reverse')tracks.reverse();
 return tracks.map(({track,index})=>`<div class="sp-track ${index===activeTrack?'sp-selected':''}"><button class="sp-track-main" onclick="spotifyPlayTrack(${index})" aria-label="播放歌曲 ${esc(track.title)}">${spotifyCover(track,index)}<span class="sp-track-copy"><strong>${esc(track.title)}</strong>${track.artist?`<small>${esc(track.artist)}</small>`:''}</span></button>${spotifyIsPlayer()?'':`<button class="sp-more" aria-label="设置${esc(track.title)}音频链接" onclick="spotifySetSource(${index})">•••</button>`}</div>`).join('')||'<p class="sp-empty">没有找到歌曲</p>';
}
function spotifyRefreshRows(){el('spotifyRows').innerHTML=spotifyRows()}
function spotifySearch(value){spotifyQuery=value;spotifyRefreshRows()}
function spotifySetFilter(value){spotifyFilter=value;renderMusic()}
function spotifySetSort(value){spotifySort=value;spotifyRefreshRows()}
renderMusic=()=>{
 el('appScreen').classList.add('spotify-mode');nav('Spotify');
 if(!state.tracks[activeTrack])activeTrack=0;
 const track=state.tracks[activeTrack],playing=!audio.paused;
 el('appContent').innerHTML=`<div class="sp-top"><button aria-label="返回手机桌面" onclick="homeScreen()">‹</button><span>Spotify</span></div>
 <div class="sp-search-row"><label><span aria-hidden="true">⌕</span><input id="spotifySearch" aria-label="在喜欢的歌曲中寻找" placeholder="在喜欢的歌曲中寻找" value="${esc(spotifyQuery)}" oninput="spotifySearch(this.value)"></label><select aria-label="歌曲排序" onchange="spotifySetSort(this.value)"><option value="default" ${spotifySort==='default'?'selected':''}>排序</option><option value="title" ${spotifySort==='title'?'selected':''}>歌曲名称</option><option value="reverse" ${spotifySort==='reverse'?'selected':''}>倒序排列</option></select></div>
 <h1 class="sp-title">喜欢的歌曲</h1><p class="sp-count">${state.tracks.length} 首歌曲</p>
 <div class="sp-actions"><div class="sp-liked-cover" aria-hidden="true">♥</div><span class="sp-actions-space"></span><button class="sp-shuffle ${spotifyShuffle?'sp-on':''}" aria-label="随机播放" aria-pressed="${spotifyShuffle}" onclick="spotifyShuffle=!spotifyShuffle;renderMusic()">⤨</button><button class="sp-play" aria-label="${playing?'暂停':'播放歌单'}" onclick="spotifyToggle()">${playing?'Ⅱ':'▶'}</button></div>
 <div class="sp-filters">${['全部','Pop','放松'].map(label=>`<button class="${spotifyFilter===label?'active':''}" aria-pressed="${spotifyFilter===label}" onclick="spotifySetFilter('${label}')">${label}</button>`).join('')}</div>
 <div id="spotifyRows" class="sp-rows">${spotifyRows()}</div>
 <div class="sp-bottom"><div class="sp-mini">${spotifyCover(track,activeTrack,true)}<div class="sp-mini-copy"><strong>${esc(track?.title||'喜欢的歌曲')}</strong><small>${esc(track?.artist||'我的音乐收藏')}</small></div><span class="sp-check" aria-label="已收藏">✓</span><button aria-label="${playing?'暂停当前歌曲':'播放当前歌曲'}" onclick="spotifyToggle()">${playing?'Ⅱ':'▶'}</button></div><nav class="sp-tabs"><button onclick="homeScreen()"><span>⌂</span>主界面</button><button onclick="document.getElementById('spotifySearch').focus()"><span>⌕</span>搜寻</button><button class="active" onclick="spotifyQuery='';spotifyFilter='全部';renderMusic()"><span>▥</span>你的音乐库</button></nav></div>`;
};
function spotifySelect(index){if(activeTrack!==index){audio.pause();audio.removeAttribute('src')}activeTrack=index;renderMusic()}
function spotifyPlayTrack(index){spotifySelect(index);if(audio.paused)spotifyPlaySelected()}
async function spotifyToggle(){
 if(!audio.paused){audio.pause();renderMusic();return}
 if(spotifyShuffle){const available=state.tracks.map((track,index)=>({track,index})).filter(({track})=>track.url);if(available.length)spotifySelect(available[Math.floor(Math.random()*available.length)].index)}
 return spotifyPlaySelected();
}
async function spotifyPlaySelected(){
 const source=spotifyTrackSource(state.tracks[activeTrack]);if(!source)return toast(spotifyIsPlayer()?'这首歌还没有添加音频':'点歌曲右侧 ••• 添加音频链接后即可播放');
 try{if(audio.getAttribute('src')!==source){audio.src=source;audio.load()}await audio.play();if(currentApp==='music')renderMusic()}catch{toast('暂时无法播放，请检查歌曲的音频链接');if(currentApp==='music')renderMusic()}
}
function spotifySetSource(index){
 if(spotifyIsPlayer())return;
 const track=state.tracks[index],value=prompt('为「'+track.title+'」添加 HTTPS 音频直链',track.url||'');if(value===null)return;
 const url=value.trim();if(url){try{if(new URL(url).protocol!=='https:')throw Error()}catch{return toast('请填写有效的 HTTPS 音频直链')}}
 track.url=url;if(index===activeTrack){audio.pause();audio.removeAttribute('src')}save();renderMusic();
}
const spotifyOpenApp=openApp;openApp=id=>{el('appScreen').classList.remove('spotify-mode');spotifyOpenApp(id)};
const spotifyHome=homeScreen;homeScreen=()=>{spotifyHome();if(!isLocked())el('appScreen').classList.remove('spotify-mode')};
audio.addEventListener('pause',()=>{if(currentApp==='music'&&el('appScreen').classList.contains('spotify-mode'))renderMusic()});
audio.addEventListener('error',()=>{if(currentApp==='music')toast('音频暂时无法播放，请检查链接')});
audio.onended=()=>{const count=state.tracks.length;for(let step=1;step<=count;step++){const next=(activeTrack+step)%count;if(state.tracks[next].url){spotifySelect(next);spotifyToggle();return}}};
