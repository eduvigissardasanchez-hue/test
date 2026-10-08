#!/usr/bin/env python3
"""Build a standalone HTML game using only the Python standard library."""
from pathlib import Path
import argparse,base64,copy,html,json,mimetypes,re,zipfile

ROOT=Path(__file__).resolve().parent
DEFAULT_COLORS={'accent':'#c00000','accentHover':'#7b1d1d','ink':'#262626',
 'muted':'#595959','surface':'#ffffff','border':'#d9d9d9','soft':'#f2f2f2',
 'disabled':'#e6e6e6','secondary':'#666666'}

def read_json(src,name):return json.loads((src/name).read_text(encoding='utf-8'))
def json_script(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def require(condition,message):
 if not condition:raise ValueError(message)

def validate(config,story,assets):
 require(config.get('schema')==1,'joc.json: schema ha de ser 1.')
 require(re.fullmatch(r'[a-z0-9][a-z0-9-]*',config.get('gameId','')),'gameId ha de ser un identificador estable en minúscules, sense espais.')
 require(re.fullmatch(r'[a-z0-9-]+',config.get('storageNamespace','')),'storageNamespace no vàlid.')
 require(isinstance(config.get('title'),str) and config['title'].strip(),'Falta el títol del joc.')
 require(isinstance(config.get('brand'),str),'Falta brand.')
 for name in ['titleLines','descriptionLines']:
  values=config.get('cover',{}).get(name)
  require(isinstance(values,list) and values and all(isinstance(v,str) for v in values),f'cover.{name} ha de ser una llista de textos.')
 require(isinstance(config['cover'].get('setting'),str),'Falta cover.setting.')
 scenes=story.get('scenes',[]);chapters=story.get('chapters',[]);itineraries=story.get('itineraries',[])
 require(bool(scenes) and bool(chapters) and bool(itineraries),'Calen escenes, capítols i itineraris.')
 ids=[s['id'] for s in scenes];by_id={s['id']:s for s in scenes}
 require(len(ids)==len(set(ids)),'Hi ha identificadors d’escena duplicats.')
 chapter_ids=[c['id'] for c in chapters];itinerary_ids=[i['id'] for i in itineraries]
 require(len(chapter_ids)==len(set(chapter_ids)),'Hi ha capítols duplicats.')
 require(len(itinerary_ids)==len(set(itinerary_ids)),'Hi ha itineraris duplicats.')
 require(config['coverSceneId'] in ids and by_id[config['coverSceneId']]['template']=='cover','coverSceneId ha d’apuntar a una portada.')
 require(config['startSceneId'] in ids and by_id[config['startSceneId']]['template']!='cover','startSceneId ha d’apuntar a una escena jugable.')
 def target(value,context):require(value in ids,f'{context}: escena de destí inexistent: {value}')
 for c in chapters:
  require(c['itinerary'] in itinerary_ids,f'Capítol {c["id"]}: itinerari inexistent.')
  if c.get('available'):
   target(c.get('sceneStart'),f'Capítol {c["id"]}')
   require(by_id[c['sceneStart']]['chapterId']==c['id'],'L’inici del capítol pertany a un altre capítol.')
   require(bool(c.get('steps')),f'Capítol {c["id"]}: cal almenys un pas.')
  for step in c.get('steps',[]):
   for name in ['start','challenge']:
    if step.get(name):target(step[name],f'Capítol {c["id"]}, pas {step["title"]}')
   if step.get('challenge'):
    require(any(l['type']=='choices' for l in by_id[step['challenge']]['layers']),f'{step["challenge"]}: el repte ha de tenir opcions.')
 for s in scenes:
  require(s['chapterId'] in chapter_ids,f'{s["id"]}: capítol inexistent.')
  c=next(c for c in chapters if c['id']==s['chapterId'])
  require(isinstance(s.get('stepIndex'),int) and 0<=s['stepIndex']<len(c.get('steps',[])),f'{s["id"]}: stepIndex fora dels passos del capítol.')
  if s.get('nextScene'):target(s['nextScene'],s['id'])
  layers=s.get('layers',[]);layer_ids=[l['id'] for l in layers]
  require(len(layer_ids)==len(set(layer_ids)),f'{s["id"]}: elements duplicats.')
  for l in layers:
   context=f'{s["id"]}/{l["id"]}'
   require(l['type'] in ['background','sprite','cover','panel','dialogue','choices','title','image'],context+': tipus d’element no suportat.')
   if l['type'] in ['background','sprite','image']:require(l.get('assetKey') in assets,context+': imatge inexistent.')
   if l.get('anchorId'):require(l['anchorId'] in layer_ids,context+': ancoratge inexistent.')
   if l['type']=='choices':
    options=l.get('options',[]);mode=l.get('mode')
    require(mode in ['single','multi'] and len(options)>=2,context+': cal un repte amb almenys dues opcions.')
    require(all(isinstance(o.get('correct'),bool) for o in options),context+': cada opció ha de declarar correct: true/false.')
    count=sum(o['correct'] for o in options)
    require(count==1 if mode=='single' else count>=1,context+': nombre de respostes correctes no vàlid.')
    if mode=='single':
     for o in options:target(o.get('targetScene'),context)
    else:
     target(l.get('successScene'),context);target(l.get('retryScene'),context)

def compile_game(src):
 config=read_json(src,'joc.json');story=copy.deepcopy(read_json(src,'historia.json'))
 characters=read_json(src,'personatges.json');registry=read_json(src,'assets.json')
 colors=DEFAULT_COLORS|read_json(src,'colors.json')
 require(all(re.fullmatch(r'#[0-9a-fA-F]{6}',v) for v in colors.values()),'colors.json: els colors han de tenir format #RRGGBB.')
 palette={old[1:]:key for key,old in DEFAULT_COLORS.items()}
 rgb_palette={tuple(bytes.fromhex(old[1:])):key for key,old in DEFAULT_COLORS.items()}
 def hex_token(match):
  raw=match[0][1:];raw=''.join(c*2 for c in raw) if len(raw) in [3,4] else raw
  key=palette.get(raw[:6].lower())
  if not key:return match[0]
  if len(raw)==8:return f'rgba(var(--theme-{key}-rgb),{int(raw[6:],16)/255:.10g})'
  return f'var(--theme-{key})'
 def rgb_token(match):
  key=rgb_palette.get(tuple(int(match[i]) for i in [1,2,3]))
  return f'rgba(var(--theme-{key}-rgb),{match[4]})' if key else match[0]
 def theme_value(value):
  value=re.sub(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)',rgb_token,value)
  return re.sub(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b',hex_token,value)
 css=theme_value((src/'estils.css').read_text(encoding='utf-8'))
 tokens=':root{'+''.join(f'--theme-{key}:{value};--theme-{key}-rgb:'+','.join(str(v) for v in bytes.fromhex(value[1:]))+';' for key,value in colors.items())+'}'
 css+='\n'+tokens+'\n'
 for scene in story['scenes']:
  for layer in scene['layers']:
   if layer.get('actorId'):
    actor=characters.get(layer['actorId']);require(actor is not None,f'Actor desconegut: {layer["actorId"]}')
    if layer['type']=='sprite':
     require(layer.get('expression') in actor['sprites'],f'Expressió desconeguda: {layer.get("expression")}')
     layer['assetKey']=actor['sprites'][layer['expression']];layer['name']=actor['name']
    elif layer['type']=='dialogue':layer['speaker']=actor['name']
   for field in ['bg','color','speakerColor','border','accent']:
    if isinstance(layer.get(field),str):layer[field]=theme_value(layer[field])
 assets={}
 for key,entry in registry.items():
  path=(src/entry['file']).resolve();require(path.is_relative_to(src.resolve()),f'Asset fora de src: {key}')
  mime=mimetypes.guess_type(path)[0]
  require(mime and mime.startswith('image/'),f'Format d’imatge no reconegut: {path.name}')
  assets[key]='data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode('ascii')
 validate(config,story,assets)
 replacements={'STYLES':css,'SETTINGS':json_script(config),'ASSETS':json_script(assets),
  'STORY':json_script(story),'ENGINE':(src/'motor.js').read_text(encoding='utf-8'),
  'TITLE':html.escape(config['title']+' · '+config['brand'])}
 shell=(src/'estructura.html').read_text(encoding='utf-8')
 return re.sub(r'@@(STYLES|SETTINGS|ASSETS|STORY|ENGINE|TITLE)@@',lambda m:replacements[m[1]],shell)

def main():
 parser=argparse.ArgumentParser(description='Genera un joc HTML autònom i, opcionalment, el paquet de fonts.')
 parser.add_argument('--src',type=Path,default=ROOT/'src')
 parser.add_argument('--output',type=Path,default=ROOT/'joc.html')
 parser.add_argument('--zip',type=Path,dest='zip_path')
 args=parser.parse_args()
 try:result=compile_game(args.src.resolve())
 except (ValueError,KeyError,TypeError,OSError,json.JSONDecodeError) as error:parser.exit(1,f'No s’ha generat el joc: {error}\n')
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(result,encoding='utf-8')
 print('HTML generat:',args.output)
 if args.zip_path:
  require(args.src.resolve()==(ROOT/'src').resolve() and args.output.resolve()==(ROOT/'joc.html').resolve(),'Per empaquetar la base, usa src i sortida per defecte.')
  args.zip_path.parent.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(args.zip_path,'w',compression=zipfile.ZIP_DEFLATED) as archive:
   for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or path.resolve()==args.zip_path.resolve() or '__pycache__' in path.parts or path.suffix in ['.pyc','.zip']:continue
    archive.write(path,Path('Del_Pla_al_Seguiment_BASE_01')/path.relative_to(ROOT))
  print('Paquet generat:',args.zip_path)

if __name__=='__main__':main()
