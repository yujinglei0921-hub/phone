"""Export an isolated playable snapshot without changing the editor entry point."""
import json,re,zipfile,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
subprocess.run(['python3',str(root/'scripts/build-preview.py')],check=True)
html=(root/'Phone-Life.html').read_text()
html=re.sub(r'<script id="privateScenarioData" type="application/json">.*?</script><script>.*?</script>', '',html,flags=re.S)
m=re.search(r'(<script id="publishedBackupData" type="application/json">)(.*?)(</script>)',html,re.S)
backup=json.loads(m[2]);data=backup['data']
remove_prefixes=[f['runId'] for f in data.get('callFlows',{}).values() if f.get('runId')]
if data.get('groupChatStory',{}).get('runId'):remove_prefixes.append(data['groupChatStory']['runId'])
for key,messages in data['chats'].items():data['chats'][key]=[x for x in messages if not any(str(x.get('id','')).startswith(prefix+'-') for prefix in remove_prefixes)]
data['callFlows']={};data['story']['done']=[];data['story']['enabled']=True;data['settings']['autoReply']=False;data['settings']['locked']=True
if data.get('groupChatStory'):
 data['groupChatStory']['phase']='idle'
 for k in ['dueAt','runId']:data['groupChatStory'].pop(k,None)
# Restore authored call history, retaining the requested starting order.
source=(root/'index.html').read_text();scenario=json.loads(re.search(r'<script id="privateScenarioData" type="application/json">(.*?)</script>',source,re.S)[1])
data['callHistory']=[dict(x,contactId=next((c['id'] for c in data['contacts'] if c['name']==x['contactName']),''),at=0,seconds=0) for x in scenario['callHistorySeed']]
html=html[:m.start(2)]+json.dumps(backup,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+html[m.end(2):]
html=html.replace('phone-life-ios18-v1','phone-life-player-20261025-v1').replace('phone-life-local-data','phone-life-player-local-data')
html=html.replace('<title>Phone Life · 我的故事手机</title>','<title>Phone Life · 游玩版</title>')
html=html.replace('</head>','<style>'+(root/'player.css').read_text()+'</style></head>')
html=html.replace('</body>','<script>'+(root/'player.js').read_text()+'</script></body>')
(root/'play.html').write_text(html)
exports=Path('/workspace/exports');exports.mkdir(exist_ok=True)
(exports/'Phone-Life-Play.html').write_text(html)
with zipfile.ZipFile(exports/'Phone-Life-Play.zip','w',zipfile.ZIP_DEFLATED) as z:z.writestr('index.html',html)
print('Exported play.html, Phone-Life-Play.html and Phone-Life-Play.zip')
