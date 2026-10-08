(()=>{
"use strict";
const SETTINGS=JSON.parse(document.getElementById("settings").textContent);
const ASSETS=JSON.parse(document.getElementById("assets").textContent);
let DATA=JSON.parse(document.getElementById("gameData").textContent);

let state={scene:DATA.scenes.findIndex(s=>s.id===SETTINGS.coverSceneId),rework:0};
let multiState={};
let answered=new Set(), reached=0;

const $=s=>document.querySelector(s);
const stage=$("#stage");

// Store only game progress. Scene IDs remain stable between client releases.
const SAVE_KEY=`${SETTINGS.storageNamespace}.${SETTINGS.gameId}.progress`;
let storageUnavailable=false;
function updateSaveStatus(){
  const text=storageUnavailable?"No s’ha pogut desar":state.resumeId?"Desat":"";
  $("#saveStatus").textContent=text;
  $("#saveStatus").classList.toggle("saveFailed",storageUnavailable);
}
function saveProgress(){
  if(!state.resumeId){updateSaveStatus();return;}
  const progress={schema:1,game:SETTINGS.gameId,sceneId:state.resumeId,
    answered:[...answered],reached,rework:state.rework,
    selections:Object.fromEntries(Object.entries(multiState).map(([key,set])=>[key,[...set]]))};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));storageUnavailable=false;}
  catch(e){storageUnavailable=true;}
  updateSaveStatus();
}
function restoreProgress(){
  let raw;
  try{raw=localStorage.getItem(SAVE_KEY);}catch(e){storageUnavailable=true;return;}
  if(!raw)return;
  try{
    const p=JSON.parse(raw);
    if(!p||p.schema!==1||p.game!==SETTINGS.gameId)return;
    const saved=DATA.scenes.find(s=>s.id===p.sceneId&&s.template!=="cover");
    if(!saved||!Array.isArray(p.answered))return;
    const validQuestions=new Set(DATA.chapters.flatMap(c=>c.steps||[]).map(s=>s.challenge).filter(Boolean));
    answered=new Set(p.answered.filter(id=>validQuestions.has(id)));
    reached=Math.max(saved.stepIndex,...stepsFor(saved).map((s,i)=>answered.has(s.challenge)?i:0));
    state.resumeId=saved.id;
    state.rework=Number.isSafeInteger(p.rework)&&p.rework>=0?p.rework:0;
    state.chapterFinished=stepsFor(saved).every(s=>answered.has(s.challenge))&&!!saved.isChapterEnd;
    for(const s of DATA.scenes)for(const l of s.layers){
      if(l.type!=="choices"||l.mode!=="multi")continue;
      const key=s.id+"_"+l.id,values=p.selections?.[key];
      if(Array.isArray(values))multiState[key]=new Set(values.filter(i=>Number.isInteger(i)&&i>=0&&i<l.options.length));
    }
  }catch(e){/* An invalid save must never prevent starting the game. */}
}
window.addEventListener("pagehide",saveProgress);
document.addEventListener("visibilitychange",()=>{if(document.hidden)saveProgress()});


function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function scene(){return DATA.scenes[state.scene]}
function chapterFor(s=scene()){return DATA.chapters.find(c=>c.id===s.chapterId)||DATA.chapters[0]}
function stepsFor(s=scene()){return chapterFor(s)?.steps||[]}
function jsonForScript(value){return JSON.stringify(value).replace(/</g,"\\u003c")}
function renderHUD(){
  const cover=scene().template==="cover",chapter=chapterFor(),steps=stepsFor();
  const itinerary=DATA.itineraries.find(it=>it.id===chapter.itinerary);
  document.body.classList.toggle("on-cover",cover);
  $("#chapterName").textContent=`Capítol ${chapter.id} · ${chapter.title}`;
  $("#itineraryName").textContent=`Itinerari ${itinerary.number} · ${itinerary.title}`+(cover?"":` · Pas ${scene().stepIndex+1} de ${steps.length}: ${steps[scene().stepIndex].title}`);
  $("#phaseTrack").innerHTML=cover?"":steps.map((p,i)=>`<span class="phase ${i===scene().stepIndex?"active":answered.has(p.challenge)?"done":""}">${esc(p.title)}</span>`).join("");
}
const canvasSize={width:1440,height:810};
function fitCanvas(){
  const viewport=$("#stageViewport"),r=viewport.getBoundingClientRect();
  let availableWidth=r.width,availableHeight=r.height;
  const scale=Math.min(availableWidth/canvasSize.width,availableHeight/canvasSize.height);
  stage.style.transform=`scale(${scale})`;
  stage.style.left=((availableWidth-canvasSize.width*scale)/2)+"px";
  stage.style.top=((availableHeight-canvasSize.height*scale)/2)+"px";
  stage.dataset.scale=String(scale);
}
window.addEventListener("resize",fitCanvas);
new ResizeObserver(fitCanvas).observe($("#stageViewport"));
function styleBox(l,el){
  if(l.type==="background") return;
  el.style.left=(l.x??0)+"%";el.style.top=(l.y??0)+"%";el.style.width=(l.w??20)+"%";el.style.height=(l.h??20)+"%";
  el.style.zIndex=l.z??10;el.style.opacity=l.opacity??1;el.style.transform=`rotate(${l.rotation??0}deg)`;
}
function renderLayer(l){
  if(l.visible===false) return null;
  const el=document.createElement("div");
  el.className="layer "+l.type+(l.locked?" locked":"");
  el.dataset.id=l.id; styleBox(l,el);
  if(l.type==="background"){
    el.style.backgroundImage=`url("${ASSETS[l.assetKey]||""}")`;
    el.style.backgroundPosition=`${l.posX??50}% ${l.posY??50}%`;
    el.style.backgroundSize=`${(l.zoom??1)*100}%`;
    el.style.opacity=l.opacity??1;
  }else if(l.type==="sprite"){
    if(l.shadow) el.classList.add("shadow");
    el.style.setProperty("--sprite-brightness",l.brightness??1);
    el.innerHTML=`<img draggable="false" src="${ASSETS[l.assetKey]||""}" alt="">`;
    if(l.flip) el.querySelector("img").style.transform="scaleX(-1)";
  }else if(l.type==="cover"){
    el.innerHTML=`<div class="coverShade"></div><div class="coverContent">
      <div class="coverSeries">${esc(SETTINGS.brand)}</div>
      <h1>${SETTINGS.cover.titleLines.map(esc).join("<br>")}<span class="coverRule" aria-hidden="true"></span></h1>
      <div class="coverSetting">${esc(SETTINGS.cover.setting)}</div>
      <p>${SETTINGS.cover.descriptionLines.map(esc).join("<br>")}</p>
      <div class="coverActions"><button type="button" class="coverStart">${state.resumeId?"Continuar la partida":"Començar"} <span aria-hidden="true">→</span></button>${state.resumeId?'<button type="button" class="coverNew">Nova partida</button>':""}</div>
    </div>`;
    el.querySelector(".coverStart").onclick=()=>goToScene(state.resumeId||SETTINGS.startSceneId);
    el.querySelector(".coverNew")?.addEventListener("click",restart);
  }else if(l.type==="panel"){
    el.dataset.style=l.style||"card";
    el.style.setProperty("--layer-bg",l.bg||"rgba(var(--theme-surface-rgb),.95)");
    el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");
    el.style.setProperty("--layer-border",l.border||"var(--theme-border)");
    el.style.setProperty("--layer-accent",l.accent||"var(--theme-accent)");
    el.style.setProperty("--layer-font",(l.fontSize||18)+"px");
    el.style.setProperty("--layer-radius",(l.radius??16)+"px");
    el.innerHTML=`<div class="panelInner"><div class="panelTitle">${esc(l.title)}</div><div class="panelText">${esc(l.text)}</div></div>`;
  }else if(l.type==="dialogue"){
    el.style.setProperty("--layer-bg",l.bg||"rgba(var(--theme-surface-rgb),.96)");
    el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");
    el.style.setProperty("--speaker-color",l.speakerColor||"var(--theme-accent)");
    el.style.setProperty("--layer-font",(l.fontSize||22)+"px");
    el.style.setProperty("--layer-radius",(l.radius??18)+"px");
    el.innerHTML=`<div class="dialogueInner"><div class="speaker">${esc(l.speaker)}</div><div class="dialogueText">${esc(l.text)}</div><button class="next">›</button></div>`;
    el.style.setProperty("--dialogue-action-width",scene().isChapterEnd?"200px":"58px");
    const next=el.querySelector(".next");
    next.setAttribute("aria-label",scene().isChapterEnd?"Veure el mapa de la història":"Continuar la conversa");
    if(scene().layers.some(layer=>layer.type==="choices"&&layer.visible!==false)){next.hidden=true;next.disabled=true;}
    if(scene().returnToQuestion){next.textContent="↻";next.setAttribute("aria-label","Tornar a respondre");next.title="Tornar a respondre";}
    if(scene().isChapterEnd){next.textContent="Veure el mapa";next.classList.add("chapterEndAction");}
    next.onclick=e=>{e.stopPropagation();if(scene().isChapterEnd)openRoutes();else nextScene()};
  }else if(l.type==="choices"){
    el.style.setProperty("--layer-bg",l.bg||"var(--theme-surface)");
    el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");
    el.style.setProperty("--layer-radius",(l.radius??12)+"px");
    el.style.setProperty("--layer-font",(l.fontSize||22)+"px");
    el.dataset.mode=l.mode;
    let opts=l.options.map((o,i)=>`<button class="choiceOption" data-i="${i}" ${l.mode==="multi"?'aria-pressed="false"':''}>${l.mode==="multi"?'<span class="choiceCheck" aria-hidden="true"></span>':`<span class="choiceLetter" aria-hidden="true">${String.fromCharCode(65+i)}</span>`}<span>${esc(o.label)}</span></button>`).join("");
    el.innerHTML=`<div class="choicesInner"><div class="prompt">${esc(l.prompt)}</div>${l.mode==="multi"?`<div class="choiceHint">${esc(l.hint||"Selecciona les opcions que consideris adequades.")}</div>`:''}<div class="choiceList">${opts}</div>${l.mode==="multi"?`<button class="btn primary" data-check="1" disabled>${esc(l.submitLabel||"Comprovar")}</button>`:""}</div>`;
    wireChoices(el,l);
  }else if(l.type==="title"){
    el.dataset.style=l.style||"card";
    el.style.setProperty("--layer-font",(l.fontSize??44)+"px");
    el.style.setProperty("--layer-bg",l.bg||"rgba(255,255,255,.94)");
    el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");
    el.style.setProperty("--layer-radius",(l.radius??18)+"px");
    el.innerHTML=`<div class="panelInner"><div class="titleEyebrow">${esc(l.eyebrow)}</div><div class="titleMain">${esc(l.title)}</div><div class="titleCopy">${esc(l.text)}</div><button class="btn primary titleAction">${esc(l.button||"Comença")}</button></div>`;
    el.querySelector(".titleAction").onclick=e=>{e.stopPropagation();nextScene()};
  }else if(l.type==="image"){
    el.innerHTML=`<img draggable="false" src="${ASSETS[l.assetKey]||""}" style="width:100%;height:100%;object-fit:${l.fit||"contain"};display:block;border-radius:${l.radius||0}px" alt="">`;
  }
  return el;
}
function wireChoices(el,l){
  const question=scene().id;
  if(l.mode==="multi"){
    const key=question+"_"+l.id;const set=multiState[key]||new Set();multiState[key]=set;
    const check=el.querySelector("[data-check]");
    const sync=()=>{el.querySelectorAll(".choiceOption").forEach(btn=>{const selected=set.has(Number(btn.dataset.i));btn.classList.toggle("selected",selected);btn.setAttribute("aria-pressed",String(selected))});check.disabled=set.size===0;};
    el.querySelectorAll(".choiceOption").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const i=Number(btn.dataset.i);if(set.has(i))set.delete(i);else set.add(i);sync();saveProgress()});
    check.onclick=e=>{e.stopPropagation();const good=l.options.map((o,i)=>o.correct?i:null).filter(i=>i!==null);const ok=set.size===good.length&&good.every(i=>set.has(i));if(ok)answered.add(question);else state.rework++;goToScene(ok?l.successScene:l.retryScene)};
    sync();
  }else{
    el.querySelectorAll(".choiceOption").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const o=l.options[Number(btn.dataset.i)];if(o.correct)answered.add(question);else state.rework++;goToScene(o.targetScene)});
  }
}
function showFeedback(text,good,onContinue){
  document.querySelector(".feedback")?.remove();
  const f=document.createElement("div");f.className="feedback"+(good?"":" warn");
  f.innerHTML=`<p>${esc(text)}</p><button class="btn ${good?"primary":""}">${good?"Continua":"Replanteja-ho"}</button>`;
  f.querySelector("button").onclick=()=>{f.remove();if(onContinue)onContinue()};
  stage.appendChild(f);
}
function render(){
  if(scene().isChapterEnd&&stepsFor().every(s=>answered.has(s.challenge)))state.chapterFinished=true;
  layoutAnchoredSprites();document.getElementById("gameData").textContent=jsonForScript(DATA);
  renderHUD();stage.innerHTML="";
  [...scene().layers].sort((a,b)=>(a.z??0)-(b.z??0)).forEach(l=>{const el=renderLayer(l);if(el)stage.appendChild(el)});
  fitCanvas();saveProgress();
}
function goToScene(id){const index=DATA.scenes.findIndex(s=>s.id===id);if(index<0)return;state.scene=index;if(scene().template!=="cover"){reached=Math.max(reached,scene().stepIndex);state.resumeId=id;}render();}
function nextScene(){
  if(scene().template==="cover"){goToScene(state.resumeId||SETTINGS.startSceneId);return;}
  if(scene().layers.some(l=>l.type==="choices"&&l.visible!==false))return;
  if(scene().nextScene){goToScene(scene().nextScene);return;}
  let next=state.scene+1;
  while(next<DATA.scenes.length&&DATA.scenes[next].branchOnly)next++;
  if(next<DATA.scenes.length)goToScene(DATA.scenes[next].id);
}
function restart(){
  if(state.resumeId){
    if(!$("#newGameDialog").open)$("#newGameDialog").showModal();
    return;
  }
  beginNewGame();
}
function beginNewGame(){
  $("#newGameDialog").close();
  state={scene:0,rework:0};answered=new Set();reached=0;multiState={};
  $("#routeMenu").close();
  // The first new scene replaces the previous checkpoint in one storage write.
  goToScene(SETTINGS.startSceneId);
}

function resumeStory(){
  $("#routeMenu").close();
  if(scene().template==="cover"){if(state.resumeId)goToScene(state.resumeId);else nextScene()}
}
function openRoutes(){
  $("#simpleMenuContents").innerHTML=`<button type="button" id="goCover" class="simple-menu-link simple-home" ${scene().template==="cover"?'aria-current="page"':''}>Portada</button>${DATA.itineraries.map(it=>`<section class="simple-menu-group"><h3>Itinerari ${it.number} · ${esc(it.title)}</h3><ol>${DATA.chapters.filter(c=>c.itinerary===it.id).map(c=>{
    const available=c.available&&!!c.sceneStart,current=scene().template!=="cover"&&scene().chapterId===c.id;
    return `<li><button type="button" class="simple-menu-link" ${available?`data-chapter="${c.id}"`:'disabled title="Capítol pendent de desenvolupar"'} ${current?'aria-current="page"':''} aria-label="Capítol ${c.id}: ${esc(c.title)}${available?'':', properament'}">${c.id} · ${esc(c.title)}</button></li>`;
  }).join("")}</ol></section>`).join("")}`;
  $("#goCover").onclick=()=>{$("#routeMenu").close();goToScene(SETTINGS.coverSceneId)};
  $("#simpleMenuContents").querySelectorAll("[data-chapter]").forEach(button=>button.onclick=()=>{
    const chapter=DATA.chapters.find(c=>c.id===Number(button.dataset.chapter));
    if(chapter.id===(scene().template==="cover"?chapterFor(DATA.scenes.find(s=>s.id===state.resumeId)||scene()).id:scene().chapterId))resumeStory();
    else if(chapter.available&&chapter.sceneStart){$("#routeMenu").close();goToScene(chapter.sceneStart)}
  });
  $("#simpleMenuContents").scrollTop=0;
  if(!$("#routeMenu").open)$("#routeMenu").showModal();
}
$("#cancelNewGame").onclick=()=>$("#newGameDialog").close();
$("#confirmNewGame").onclick=beginNewGame;
$("#menuBtn").onclick=openRoutes;$("#closeRoutes").onclick=()=>$("#routeMenu").close();$("#restartBtn").onclick=restart;
$("#routeMenu").addEventListener("click",e=>{if(e.target===$("#routeMenu")){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
window.addEventListener("keydown",e=>{
  if($("#routeMenu").open||$("#newGameDialog").open||e.target.closest("input,textarea,select,button,[contenteditable]"))return;
  if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();if(scene().isChapterEnd)openRoutes();else nextScene();}
});
function layoutAnchoredSprites(){
  const layers=scene().layers;
  layers.filter(l=>l.type==="sprite"&&l.anchorDialogue).forEach(l=>{
    const reference=layers.find(r=>r.id===l.anchorId&&r.visible!==false)||layers.find(r=>r.type==="dialogue"&&r.visible!==false)||layers.find(r=>r.type==="title"&&r.visible!==false);
    if(reference){l.anchorId=reference.id;l.y=Math.max(0,Math.min(100-l.h,reference.y-l.h+(l.anchorOverlap??4)));}
  });
}
restoreProgress();
render();
})();
