"""Integration checks: install playwright separately; run from any directory."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json, os
ROOT=Path(__file__).resolve().parents[1]
STORY=json.loads((ROOT/'src/historia.json').read_text())
BY_ID={s['id']:s for s in STORY['scenes']}
KEY='midenet.del-pla-al-seguiment.progress'
results=[];errors=[];requests=[]
def check(ok,label):
 assert ok,label
 results.append(label)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/joc.html'
def saved(page):return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
seed_count=0
def seed_raw(page,raw):
 global seed_count
 seed_count+=1
 token=f'check_game.seed.{seed_count}'
 # Apply each fixture once in the new document, after the old page's save.
 page.add_init_script('(()=>{const token='+json.dumps(token)+';if(!sessionStorage.getItem(token)){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(raw)+');sessionStorage.setItem(token,"1")}})();')
 page.reload()
def seed(page,scene,**extra):
 data={'schema':2,'game':'del-pla-al-seguiment','sceneId':scene,'unlocked':list(range(1,10)),**extra}
 seed_raw(page,json.dumps(data));page.locator('.coverStart').click();assert current(page)==scene,scene
def current(page):return saved(page)['sceneId']
def answer(page,scene,good=True,index=None):
 layer=next(l for l in scene['layers'] if l['type']=='choices')
 if layer['mode']=='order':
  if good:
   # Place each item in its correct position through the actual arrow buttons.
   for goal,item in enumerate(layer['correctOrder']):
    while page.locator('.orderItem').evaluate_all('es=>es.map(e=>e.dataset.item)').index(item)>goal:
     page.locator(f'button[data-item="{item}"][data-move="-1"]').click()
  page.locator('[data-check]').click()
 elif layer['mode']=='multi':
  picks=[i for i,o in enumerate(layer['options']) if o['correct']]
  if not good:picks=[0,2]
  for i in picks:page.locator(f'.choiceOption[data-i="{i}"]').click()
  page.locator('[data-check]').click()
 else:
  i=index if index is not None else next(i for i,o in enumerate(layer['options']) if o['correct']==good)
  page.locator(f'.choiceOption[data-i="{i}"]').click()
def audit(page,scene,w,h):
 bad=page.evaluate('''()=>{
 const bad=[];const v=document.querySelector('#stageViewport'),stage=document.querySelector('#stage');
 if(document.documentElement.scrollWidth>innerWidth+1||v.scrollWidth>v.clientWidth+1)bad.push('horizontal scroll');
 for(const e of document.querySelectorAll('.dialogueInner,.choicesInner'))if(e.scrollHeight>e.clientHeight+2)bad.push('overflow '+e.className);
 for(const e of document.querySelectorAll('.dialogueText,.speaker,.speakerRole,.sceneTime,.prompt,.choiceOption,.orderCopy,.coverContent,.coverActions')){
  const r=e.getBoundingClientRect(),s=stage.getBoundingClientRect();
  if(r.left<s.left-1||r.right>s.right+1||r.bottom>s.bottom+1)bad.push('outside stage '+e.className);
 }
 if(innerWidth<=900){for(const e of document.querySelectorAll('.dialogueText,.choiceOption'))if(parseFloat(getComputedStyle(e).fontSize)<17)bad.push('small text');}
 return bad;
}''')
 check(not bad,f'Layout {scene["id"]} at {w}×{h}: {bad}')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  for w,h in [(1440,900),(1280,720),(390,844),(320,568),(844,390)]:
   ctx=browser.new_context(viewport={'width':w,'height':h});page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(url)
   audit(page,BY_ID['cover'],w,h)
   page.locator('.coverStart').click()
   check(current(page)=='plan_1_intro',f'New game {w}')
   page.locator('#menuBtn').click()
   check(page.locator('.simple-menu-group h3').all_text_contents()==['Itinerari 1 · Planificació','Itinerari 2 · Seguiment'],f'Two clear itinerary lists {w}')
   links=page.locator('.simple-menu-group button')
   check(links.count()==9 and all(t.strip() for t in links.all_text_contents()),f'Nine named chapters {w}')
   check(page.locator('.simple-menu-group button:disabled').count()==8,f'Future chapters gated {w}')
   page.locator('#closeRoutes').click()
   turns=0
   while current(page)!='closing':
    turns+=1;assert turns<50,'Loop in story'
    s=BY_ID[current(page)];audit(page,s,w,h)
    choice=next((l for l in s['layers'] if l['type']=='choices'),None)
    if choice:
     page.locator('#stage').focus();page.keyboard.press('ArrowRight');page.keyboard.press('Space')
     check(current(page)==s['id'] and page.locator('.next').is_hidden(),f'Question gates navigation {s["id"]} {w}')
     answer(page,s)
    else:page.locator('.next').click()
   audit(page,BY_ID['closing'],w,h);progress=saved(page)
   check(len(progress['answered'])==9 and len(progress['completed'])==9 and all(x['correct'] for x in progress['responses'].values()),f'All nine correct and completed {w}')
   page.reload();check('Continuar' in page.locator('.coverStart').inner_text(),f'Continue after reload {w}')
   page.locator('.coverStart').click();check(current(page)=='closing',f'Exact resume {w}')
   page.locator('.storyEndAction').click();page.locator('.coverNew').click();page.locator('#cancelNewGame').click();check(saved(page)['sceneId']=='closing',f'New game cancel preserves progress {w}')
   page.locator('.coverNew').click();page.locator('#confirmNewGame').click()
   check(current(page)=='plan_1_intro' and not saved(page)['answered'] and saved(page)['unlocked']==[1],f'New game resets all progress {w}')
   # Every branch is also audited, including feedback with the longest text.
   for s in STORY['scenes']:
    if s.get('branchOnly'):
     seed(page,s['id']);audit(page,s,w,h)
   ctx.close()
  ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(url)
  for s in STORY['scenes']:
   choice=next((l for l in s['layers'] if l['type']=='choices'),None)
   if not choice:continue
   indices=[i for i,o in enumerate(choice.get('options',[])) if not o['correct']] if choice['mode'] in ['single','compare'] else [None]
   for i in indices:
    seed(page,s['id']);answer(page,s,False,i);feedback=BY_ID[current(page)]
    check(feedback.get('isCaseEnd') and saved(page)['responses'][s['id']]['correct'] is False,f'Wrong answer explained {s["id"]}:{i}')
    page.locator('.next').click()
    check(current(page)==feedback['nextScene'] and (BY_ID[current(page)]['chapterId']>s['chapterId'] or current(page)=='closing'),f'Wrong answer continues without retry {s["id"]}:{i}')
  seed(page,'seguiment_5_decision');page.locator('.choiceOption[data-i="0"]').click()
  check(page.locator('[data-check]').is_disabled(),'Multi requires exactly two choices')
  page.reload();page.locator('.coverStart').click();check(page.locator('.choiceOption[data-i="0"]').get_attribute('aria-pressed')=='true','Partial multi selection resumes')
  seed(page,'plan_3_decision');page.locator('button[data-item="validation"][data-move="-1"]').click()
  order=page.locator('.orderItem').evaluate_all('es=>es.map(e=>e.dataset.item)');page.reload();page.locator('.coverStart').click()
  check(page.locator('.orderItem').evaluate_all('es=>es.map(e=>e.dataset.item)')==order,'Partial order resumes')
  page.locator('#menuBtn').click();before=current(page);page.keyboard.press('ArrowRight');check(current(page)==before,'Modal blocks story keyboard shortcuts');page.keyboard.press('Escape');check(not page.locator('#routeMenu').evaluate('e=>e.open'),'Escape closes menu')
  page.locator('#menuBtn').click();page.locator('[data-chapter="4"]').click();check(current(page)=='plan_4_intro','Menu moves to reached chapter')
  page.locator('#menuBtn').click();page.locator('#goCover').click();page.locator('.coverStart').click();check(current(page)=='plan_4_intro','Menu cover preserves current scene')
  seed_raw(page,"{broken");check(page.locator('.coverStart').inner_text().startswith('Començar'),'Corrupt save fails safely')
  ctx.close()
  ctx=browser.new_context();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  page.add_init_script('Storage.prototype.setItem=function(){throw new Error("blocked")};Storage.prototype.getItem=function(){throw new Error("blocked")}')
  page.goto(url);page.locator('.coverStart').click();check(page.locator('#saveStatus').inner_text()=='No s’ha pogut desar','Blocked storage reports failure without preventing play');page.locator('.next').click();check(page.locator('.speaker').inner_text()=='Aina','Blocked storage allows progress')
  ctx.close();browser.close()
 check(not errors,f'No browser exceptions: {errors}')
 check(all(u.startswith(f'http://127.0.0.1:{server.server_port}/') or u.startswith('data:') for u in requests),'No external resource requests')
 check(len(STORY['chapters'])==9 and sum(any(l['type']=='choices' for l in x['layers']) for x in STORY['scenes'])==9,'Exactly nine cases and nine decisions')
 for actor,x in [('marta',65),('julia',2)]:
  check(all(l['x']==x for scene in STORY['scenes'] if scene['template']!='cover' for l in scene['layers'] if l['type']=='sprite' and l['actorId']==actor),f'Stable stage position for {actor}')
 report={'status':'passed','checks':len(results),'viewports':[[1440,900],[1280,720],[390,844],[320,568],[844,390]],'browser':'Chromium','checksDetail':results,'humanTiming':'Estimated only; pilot with participants pending.'}
 (ROOT/'VALIDACIO.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(f'PASS: {len(results)} checks; nine chapters, every incorrect answer, five viewports, save, menu, restart.')
finally:server.shutdown();server.server_close()
