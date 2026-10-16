from pathlib import Path
import json, urllib.request, xml.etree.ElementTree as ET, concurrent.futures, io
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/392fc81d5190ceca40c08ef4c754f226458b5f59/sprite'
roster={'pikachu':25,'charizard':6,'blastoise':9,'venusaur':3,'gengar':94,'machamp':68,'snorlax':143,'lucario':448,'garchomp':445,'gardevoir':282}
def fetch(entry):
 name,dex=entry; directory=ROOT/'public/arena/sprites'/name
 nodes={a.findtext('Name'):a for a in ET.parse(directory/'AnimData.xml').findall('./Anims/Anim')}; result={}
 for wanted in ['Idle','Walk','Attack']:
  source=wanted if wanted in nodes else 'Idle'; node=nodes[source]
  while node.findtext('CopyOf'):
   source=node.findtext('CopyOf'); node=nodes[source]
  target=directory/(wanted+'-Anim.png')
  if not target.exists():
   try:
    target.write_bytes(urllib.request.urlopen(f'{BASE}/{dex:04d}/{source}-Anim.png',timeout=35).read())
   except Exception as ex:
    print(name,wanted,str(ex)); continue
  w,h=int(node.findtext('FrameWidth')),int(node.findtext('FrameHeight'))
  im=Image.open(target); box=im.crop((0,0,w,h)).getbbox() or (0,0,w,h)
  result[wanted]={'width':w,'height':h,'durations':[int(d.text) for d in node.findall('./Durations/Duration')],'rows':im.height//h,'offsetX':(box[0]+box[2])/2-w/2,'offsetY':box[3]-h/2}
 return name,result
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 data=dict(pool.map(fetch,roster.items()))
(ROOT/'src/combat-sprites.json').write_text(json.dumps(data,indent=2))
print('Imported animations',sum(len(a) for a in data.values()))
