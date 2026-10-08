(()=>{
"use strict";
const SETTINGS=JSON.parse(document.getElementById("settings").textContent);
const ASSETS=JSON.parse(document.getElementById("assets").textContent);
const DATA=JSON.parse(document.getElementById("gameData").textContent);
const $=s=>document.querySelector(s),stage=$("#stage"),viewport=$("#stageViewport");
const byId=new Map(DATA.scenes.map(s=>[s.id,s]));
const SAVE_KEY=`${SETTINGS.storageNamespace}.${SETTINGS.gameId}.progress`;
const firstChapter=DATA.chapters.find(c=>c.sceneStart===SETTINGS.startSceneId);
let state=freshState(),storageUnavailable=false;
function freshState(){return {scene:SETTINGS.coverSceneId,resumeId:null,answered:new Set(),responses:{},selections:{},orders:{},chapterPositions:{},unlocked:new Set([firstChapter.id]),completed:new Set()}}
function scene(){return byId.get(state.scene)}
function chapterFor(s=scene()){return DATA.chapters.find(c=>c.id===s.chapterId)||firstChapter}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function jsonForScript(v){return JSON.stringify(v).replace(/</g,"\\u003c")}
function saveProgress(){
  if(state.resumeId){
    const p={schema:2,game:SETTINGS.gameId,sceneId:state.resumeId,answered:[...state.answered],responses:state.responses,selections:state.selections,orders:state.orders,chapterPositions:state.chapterPositions,unlocked:[...state.unlocked],completed:[...state.completed]};
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(p));storageUnavailable=false}catch(e){storageUnavailable=true}
  }
  $("#saveStatus").textContent=storageUnavailable?"No s’ha pogut desar":state.resumeId?"Desat":"";
  $("#saveStatus").classList.toggle("saveFailed",storageUnavailable);
}
function restoreProgress(){
  let raw;try{raw=localStorage.getItem(SAVE_KEY)}catch(e){storageUnavailable=true;return}
  if(!raw)return;
  try{
    const p=JSON.parse(raw);
    if(!p||p.schema!==2||p.game!==SETTINGS.gameId||!byId.has(p.sceneId)||byId.get(p.sceneId).template==="cover")return;
    const questions=new Set(DATA.scenes.filter(s=>s.layers.some(l=>l.type==="choices")).map(s=>s.id));
    const chapters=new Set(DATA.chapters.map(c=>c.id));
    const restored=freshState();restored.resumeId=p.sceneId;
    restored.answered=new Set((Array.isArray(p.answered)?p.answered:[]).filter(id=>questions.has(id)));
    restored.unlocked=new Set([firstChapter.id,...(Array.isArray(p.unlocked)?p.unlocked:[]).filter(id=>chapters.has(id)),byId.get(p.sceneId).chapterId]);
    restored.completed=new Set((Array.isArray(p.completed)?p.completed:[]).filter(id=>chapters.has(id)));
    for(const c of DATA.chapters){const id=p.chapterPositions?.[c.id];if(byId.has(id)&&byId.get(id).chapterId===c.id)restored.chapterPositions[c.id]=id}
    for(const s of DATA.scenes)for(const l of s.layers){
      if(l.type!=="choices")continue;
      const key=s.id+"_"+l.id;
      if(l.mode==="multi"&&Array.isArray(p.selections?.[key]))restored.selections[key]=[...new Set(p.selections[key].filter(i=>Number.isInteger(i)&&i>=0&&i<l.options.length))];
      if(l.mode==="order"&&Array.isArray(p.orders?.[key])){
        const ids=l.items.map(i=>i.id),order=p.orders[key];
        if(order.length===ids.length&&new Set(order).size===ids.length&&order.every(id=>ids.includes(id)))restored.orders[key]=order.slice();
      }
      const response=p.responses?.[s.id];
      if(response&&typeof response.correct==="boolean"&&Array.isArray(response.selected))restored.responses[s.id]={correct:response.correct,selected:response.selected};
    }
    state=restored;
  }catch(e){/* Corrupt saves must not prevent playing. */}
}
window.addEventListener("pagehide",saveProgress);
document.addEventListener("visibilitychange",()=>{if(document.hidden)saveProgress()});
function renderHUD(){
  const s=scene(),cover=s.template==="cover",c=chapterFor(),it=DATA.itineraries.find(i=>i.id===c.itinerary);
  document.body.classList.toggle("on-cover",cover);
  document.body.classList.toggle("is-question",s.layers.some(l=>l.type==="choices"));
  $("#chapterName").textContent=`Capítol ${c.id} · ${c.title}`;
  $("#itineraryName").textContent=`Itinerari ${it.number} · ${it.title} · Pas ${s.stepIndex+1} de ${c.steps.length}: ${c.steps[s.stepIndex].title}`;
  $("#phaseTrack").innerHTML=cover?"":c.steps.map((p,i)=>`<span class="phase ${i===s.stepIndex?"active":i<s.stepIndex?"done":""}" ${i===s.stepIndex?'aria-current="step"':''}>${esc(p.title)}</span>`).join("");
}
function fitCanvas(){
  if(matchMedia("(max-width:900px)").matches){stage.style.transform="none";stage.style.left="0px";stage.style.top="0px";stage.dataset.scale="1";return}
  const r=viewport.getBoundingClientRect(),scale=Math.min(r.width/1440,r.height/810);
  stage.style.transform=`scale(${scale})`;stage.style.left=((r.width-1440*scale)/2)+"px";stage.style.top=((r.height-810*scale)/2)+"px";stage.dataset.scale=String(scale);
}
window.addEventListener("resize",fitCanvas);new ResizeObserver(fitCanvas).observe(viewport);
function styleBox(l,el){
  if(l.type==="background")return;
  Object.assign(el.style,{left:(l.x??0)+"%",top:(l.y??0)+"%",width:(l.w??20)+"%",height:(l.h??20)+"%",zIndex:l.z??10,opacity:l.opacity??1,transform:`rotate(${l.rotation??0}deg)`});
}
function renderLayer(l){
  if(l.visible===false)return null;
  const el=document.createElement("div");el.className="layer "+l.type;el.dataset.id=l.id;styleBox(l,el);
  if(l.type==="background"){
    el.style.backgroundImage=`url("${ASSETS[l.assetKey]||""}")`;el.style.backgroundPosition=`${l.posX??50}% ${l.posY??50}%`;el.style.backgroundSize=`${(l.zoom??1)*100}%`;
  }else if(l.type==="sprite"){
    el.dataset.actor=l.actorId||"";el.classList.add((l.x??0)<50?"sprite-left":"sprite-right");
    el.style.setProperty("--sprite-brightness",l.brightness??1);
    el.innerHTML=`<img draggable="false" src="${ASSETS[l.assetKey]||""}" alt="">`;
    const img=el.querySelector("img"),zoom=l.imageScale||1;
    if(zoom>1)el.classList.add("sprite-guest");
    if(zoom!==1||l.flip){img.style.transform=`scale(${zoom})${l.flip?' scaleX(-1)':''}`;img.style.transformOrigin=zoom!==1?"center top":"center"}
  }else if(l.type==="cover"){
    el.innerHTML=`<div class="coverShade"></div><div class="coverContent"><div class="coverSeries">${esc(SETTINGS.brand)}</div><h1>${SETTINGS.cover.titleLines.map(esc).join("<br>")}<span class="coverRule" aria-hidden="true"></span></h1><div class="coverSetting">${esc(SETTINGS.cover.setting)}</div><p>${SETTINGS.cover.descriptionLines.map(esc).join("<br>")}</p><div class="coverActions"><button type="button" class="coverStart">${state.resumeId?"Continuar la partida":"Començar"} <span aria-hidden="true">→</span></button>${state.resumeId?'<button type="button" class="coverNew">Nova partida</button>':""}</div></div>`;
    el.querySelector(".coverStart").onclick=()=>goToScene(state.resumeId||SETTINGS.startSceneId);
    el.querySelector(".coverNew")?.addEventListener("click",restart);
  }else if(l.type==="dialogue"){
    el.style.setProperty("--layer-bg",l.bg||"var(--theme-surface)");el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");
    el.style.setProperty("--speaker-color",l.speakerColor||"var(--theme-accent)");el.style.setProperty("--layer-font",(l.fontSize||26)+"px");el.style.setProperty("--layer-radius",(l.radius??10)+"px");
    el.innerHTML=`<div class="dialogueInner"><div class="sceneTime">${esc(scene().time)}</div><div class="speaker">${esc(l.speaker)}</div><div class="speakerRole">${esc(l.role)}</div><div class="dialogueText">${esc(l.text)}</div><button type="button" class="next" aria-label="${scene().isStoryEnd?'Acabar i tornar a la portada':'Continuar la història'}">${scene().isStoryEnd?'Acabar':'›'}</button></div>`;
    const next=el.querySelector(".next");
    if(scene().layers.some(x=>x.type==="choices"&&x.visible!==false)){next.hidden=true;next.disabled=true}
    if(scene().isStoryEnd){next.classList.add("storyEndAction");next.onclick=()=>goToScene(SETTINGS.coverSceneId)}else next.onclick=nextScene;
  }else if(l.type==="choices"){
    el.dataset.mode=l.mode;el.style.setProperty("--layer-bg",l.bg||"var(--theme-surface)");el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");el.style.setProperty("--layer-radius",(l.radius??8)+"px");
    el.innerHTML=`<div class="choicesInner"><div class="prompt">${esc(l.prompt)}</div><div class="choiceContent"></div></div>`;
    renderChoices(el,l);
  }else if(l.type==="panel"||l.type==="title"){
    el.style.setProperty("--layer-bg",l.bg||"var(--theme-surface)");el.style.setProperty("--layer-color",l.color||"var(--theme-ink)");
    el.innerHTML=`<div class="panelInner"><div class="panelTitle">${esc(l.title)}</div><div class="panelText">${esc(l.text)}</div></div>`;
  }else if(l.type==="image")el.innerHTML=`<img src="${ASSETS[l.assetKey]||""}" alt="" style="width:100%;height:100%;object-fit:contain">`;
  return el;
}
function respond(question,selected,correct,target){
  state.answered.add(question);state.responses[question]={selected,correct};goToScene(target);
}
function renderChoices(el,l){
  const q=scene().id,key=q+"_"+l.id,content=el.querySelector(".choiceContent");
  if(l.mode==="order"){
    const ids=l.items.map(i=>i.id);let order=state.orders[key]||(l.initialOrder||ids).slice();state.orders[key]=order;
    const sync=()=>{
      content.innerHTML=`<div class="choiceHint">Ordena amb les fletxes.</div><ol class="orderList">${order.map((id,i)=>{const item=l.items.find(x=>x.id===id);return `<li class="orderItem" data-item="${esc(id)}"><span class="orderNumber" aria-hidden="true">${i+1}</span><span class="orderCopy"><strong>${esc(item.label)}</strong><span>${esc(item.detail)}</span></span><span class="orderControls"><button type="button" data-move="-1" data-item="${esc(id)}" ${i===0?'disabled':''} aria-label="Pujar ${esc(item.label)}">↑</button><button type="button" data-move="1" data-item="${esc(id)}" ${i===order.length-1?'disabled':''} aria-label="Baixar ${esc(item.label)}">↓</button></span></li>`}).join("")}</ol><button type="button" class="btn primary" data-check>${esc(l.submitLabel||"Confirmar l’ordre")}</button>`;
      content.querySelectorAll("[data-move]").forEach(b=>b.onclick=()=>{
        const i=order.indexOf(b.dataset.item),j=i+Number(b.dataset.move);if(j<0||j>=order.length)return;
        const id=b.dataset.item;[order[i],order[j]]=[order[j],order[i]];state.orders[key]=order.slice();sync();saveProgress();
        content.querySelector(`[data-item="${id}"] button:not(:disabled)`)?.focus();
      });
      content.querySelector("[data-check]").onclick=()=>{const ok=order.every((id,i)=>id===l.correctOrder[i]);respond(q,order.slice(),ok,ok?l.successScene:l.retryScene)};
    };sync();return;
  }
  const multi=l.mode==="multi",compare=l.mode==="compare";
  content.innerHTML=`${multi?`<div class="choiceHint">${esc(l.hint)}</div>`:""}<div class="choiceList">${l.options.map((o,i)=>`<button type="button" class="choiceOption" data-i="${i}" ${multi?'aria-pressed="false"':''}>${multi?'<span class="choiceCheck" aria-hidden="true"></span>':`<span class="choiceLetter" aria-hidden="true">${String.fromCharCode(65+i)}</span>`}<span class="choiceCopy">${compare?`<strong class="proposalLabel">Proposta ${String.fromCharCode(65+i)}</strong>`:""}${esc(o.label)}</span></button>`).join("")}</div>${multi?`<button type="button" class="btn primary" data-check>${esc(l.submitLabel)}</button>`:""}`;
  if(multi){
    const set=new Set(state.selections[key]||[]),good=l.options.flatMap((o,i)=>o.correct?[i]:[]),check=content.querySelector("[data-check]");
    const sync=()=>{content.querySelectorAll(".choiceOption").forEach(b=>{const selected=set.has(Number(b.dataset.i));b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected))});check.disabled=set.size!==good.length};
    content.querySelectorAll(".choiceOption").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);set.has(i)?set.delete(i):set.add(i);state.selections[key]=[...set];sync();saveProgress()});
    check.onclick=()=>{const ok=set.size===good.length&&good.every(i=>set.has(i));respond(q,[...set],ok,ok?l.successScene:l.retryScene)};sync();
  }else content.querySelectorAll(".choiceOption").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i),o=l.options[i];respond(q,[i],o.correct,o.targetScene)});
}
function layoutAnchoredSprites(){
  const layers=scene().layers;
  layers.filter(l=>l.type==="sprite"&&l.anchorDialogue).forEach(l=>{const ref=layers.find(x=>x.id===l.anchorId&&x.visible!==false)||layers.find(x=>x.type==="dialogue");if(ref)l.y=Math.max(0,Math.min(100-l.h,ref.y-l.h+(l.anchorOverlap??4)))});
}
function render(){
  layoutAnchoredSprites();$("#gameData").textContent=jsonForScript(DATA);renderHUD();stage.innerHTML="";
  // Semantic reading order on mobile; z-index keeps the original desktop composition.
  const rank={background:0,sprite:1,cover:2,dialogue:3,panel:4,title:4,image:4,choices:5};
  [...scene().layers].sort((a,b)=>(rank[a.type]??4)-(rank[b.type]??4)).forEach(l=>{const el=renderLayer(l);if(el)stage.append(el)});
  stage.setAttribute("aria-label",scene().template==="cover"?SETTINGS.title:`Capítol ${chapterFor().id}: ${chapterFor().title}`);fitCanvas();saveProgress();
}
function goToScene(id){
  if(!byId.has(id))return;
  const previous=scene(),next=byId.get(id);
  if(previous.isCaseEnd&&(previous.chapterId!==next.chapterId||next.isStoryEnd))state.completed.add(previous.chapterId);
  state.scene=id;
  if(next.template!=="cover"){state.resumeId=id;state.unlocked.add(next.chapterId);state.chapterPositions[next.chapterId]=id}
  render();viewport.scrollTop=0;stage.focus({preventScroll:true});
}
function nextScene(){
  if(scene().template==="cover"){goToScene(state.resumeId||SETTINGS.startSceneId);return}
  if(scene().layers.some(l=>l.type==="choices"&&l.visible!==false))return;
  if(scene().isStoryEnd){goToScene(SETTINGS.coverSceneId);return}
  if(scene().nextScene){goToScene(scene().nextScene);return}
}
function restart(){if(state.resumeId){if(!$("#newGameDialog").open)$("#newGameDialog").showModal()}else beginNewGame()}
function beginNewGame(){ $("#newGameDialog").close();$("#routeMenu").close();state=freshState();goToScene(SETTINGS.startSceneId)}
function openRoutes(){
  $("#simpleMenuContents").innerHTML=`<button type="button" id="goCover" class="simple-menu-link simple-home" ${scene().template==="cover"?'aria-current="page"':''}>Portada</button>${DATA.itineraries.map(it=>`<section class="simple-menu-group"><h3>Itinerari ${it.number} · ${esc(it.title)}</h3><ol>${DATA.chapters.filter(c=>c.itinerary===it.id).map(c=>{
    const unlocked=state.unlocked.has(c.id),current=scene().template!=="cover"&&scene().chapterId===c.id;
    return `<li><button type="button" class="simple-menu-link" ${unlocked?`data-chapter="${c.id}"`:'disabled title="Encara no has arribat a aquest capítol"'} ${current?'aria-current="page"':''} aria-label="Capítol ${c.id}: ${esc(c.title)}${unlocked?'':', continua la història per arribar-hi'}">${c.id} · ${esc(c.title)}</button></li>`;
  }).join("")}</ol></section>`).join("")}`;
  $("#goCover").onclick=()=>{$("#routeMenu").close();goToScene(SETTINGS.coverSceneId)};
  $("#simpleMenuContents").querySelectorAll("[data-chapter]").forEach(b=>b.onclick=()=>{
    const c=DATA.chapters.find(x=>x.id===Number(b.dataset.chapter));$("#routeMenu").close();
    if(scene().template!=="cover"&&c.id===scene().chapterId)return;
    const saved=byId.get(state.resumeId);
    goToScene(scene().template==="cover"&&saved?.chapterId===c.id?state.resumeId:c.sceneStart);
  });
  $("#simpleMenuContents").scrollTop=0;if(!$("#routeMenu").open)$("#routeMenu").showModal();
}
$("#menuBtn").onclick=openRoutes;$("#closeRoutes").onclick=()=>$("#routeMenu").close();$("#restartBtn").onclick=restart;
$("#cancelNewGame").onclick=()=>$("#newGameDialog").close();$("#confirmNewGame").onclick=beginNewGame;
$("#routeMenu").addEventListener("click",e=>{if(e.target===$("#routeMenu")){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
window.addEventListener("keydown",e=>{if($("#routeMenu").open||$("#newGameDialog").open||e.target.closest("button,input,select,textarea,[contenteditable]"))return;if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();nextScene()}});
stage.tabIndex=-1;restoreProgress();render();
})();
