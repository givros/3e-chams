import {course,chapters,solution} from './course.js';
import {defaults,cuisines,migrateSource,prepareSeed,visualDraft,onlyVisualChange,accentText} from './identity.js';
import {createStandalone} from './export-app.js';
import {objectives, normalizeProgress, ready, record, needsReview, diagnosticFor, guidanceFor} from './progression.js';
const $ = s => document.querySelector(s);
const storageKey = 'juvign-miam-v1';
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
let config={...defaults};
let menu=[];
function updateMenu() {
 const specialty=cuisines[config.cuisine]||cuisines.burger;
 menu=[{name:config.mainName,description:specialty.description,price:config.mainPrice,image:config.mainPhoto==='auto'?specialty.image:config.mainPhoto,tag:'TA SIGNATURE'},
 {name:config.sideName,description:'Un accompagnement choisi par ton restaurant.',price:config.sidePrice,image:'fries',tag:'LE BON DUO'},
 {name:config.drinkName,description:'Ta boisson pour accompagner le repas.',price:config.drinkPrice,image:'drink',tag:'LA PAUSE FRAÎCHE'}];
}
updateMenu();
let state = {index:0,unlocked:0,source:course[0].seed,verified:'',completed:[],observed:[],started:false,hints:0};
let storageWarning = '';
try { const data=JSON.parse(localStorage.getItem(storageKey)); if(validBackup(data)) state=data; } catch { storageWarning='La sauvegarde locale est indisponible. Pense à exporter ton travail.'; }
normalizeProgress(state);
if(state.personalizationVersion!==1 && state.verified){
 state.source=migrateSource(state.source);state.verified=migrateSource(state.verified);state.personalizationVersion=1;
}
if(!state.introVersion && !state.completed.length && !state.verified){state.started=false;if(state.source==='const restaurantName = "À toi de choisir";')state.source='';}
let creative=false,draft=null,draftTimer;
let demo=!!state.demoSession, quantities=[0,0,0],page='menu',promo='',applied='',toast='',busy=false,revision=0,selected=null,renderedPage=null;
function validBackup(data) { return data && Number.isInteger(data.index) && data.index>=0 && data.index<course.length && Number.isInteger(data.unlocked) && data.unlocked>=data.index && data.unlocked<course.length && typeof data.source==='string' && data.source.length<50000 && typeof data.verified==='string' && data.verified.length<50000 && Array.isArray(data.completed) && data.completed.every(n=>Number.isInteger(n)&&n>=0&&n<course.length) && Array.isArray(data.observed) && data.observed.every(x=>['paid','free'].includes(x)) && typeof data.started==='boolean'; }
function save() { try { localStorage.setItem(storageKey,JSON.stringify(state)); } catch { storageWarning='Sauvegarde locale indisponible : utilise Exporter.'; } }
function message(text,type='') { $('#feedback').textContent=text; $('#feedback').className='feedback '+type; }
function run(source, tests=[],request=null) { return new Promise((resolve,reject)=>{ const worker=new Worker('src/worker.js',{type:'module'}); const timer=setTimeout(()=>{worker.terminate();reject(Error('Ton code prend trop de temps. Vérifie qu’il ne contient pas de boucle infinie.'));},1300); worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();data.error?reject(Error(data.error)):resolve(data.value);}; worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Impossible de lire ce code. Vérifie les guillemets, parenthèses et accolades.'));}; worker.postMessage({source,tests,request}); }); }
async function call(method,args=[]) { return run(demo?solution:state.verified,[],{method,args}); }
function allTests(index) { return course.slice(0,index+1).flatMap(m=>m.tests||[]); }
function updateLines() { $('#lines').textContent=state.source.split('\n').map((_,i)=>i+1).join('\n'); $('#lines').scrollTop=$('#code').scrollTop; }
function renderMode() {
 document.body.classList.toggle('demo-only',demo);
 $('#exit-demo').hidden=!demo;
 $('#exit-demo').textContent=state.started?'Quitter la démo et reprendre mon TP →':'Quitter la démo et commencer mon TP à zéro →';
}
function cleanSource() { return state.source===state.verified && !!state.verified; }
function personalObjective(index,key,text) {
 const texts={
  'add-two':`Ajoute deux exemplaires de « ${config.mainName} ».`,
  'line-one':`Ouvre le panier avec un exemplaire de ton plat : ${money(config.mainPrice)}.`,
  'line-two':`Ouvre le panier avec deux exemplaires : ${money(config.mainPrice*2)}.`,
  paid:`Observe les frais pour un panier non vide sous ${money(config.freeDeliveryAt)}.`,
  free:`Observe la livraison offerte à partir de ${money(config.freeDeliveryAt)}.`,
  'promo-rejected':`Essaie un autre code que ${config.promoCode}, avec au moins ${money(config.promoMinimum)} de plats.`,
  'promo-small':`Essaie ${config.promoCode} avec moins de ${money(config.promoMinimum)} de plats.`,
  'promo-accepted':`Essaie ${config.promoCode} à partir de ${money(config.promoMinimum)} : ${money(config.promoValue)} de réduction.`,
  'total-with-promo':`Observe le total après application de ${config.promoCode}.`,
  order:`Confirme avec ${config.promoCode} et au moins ${money(Math.max(config.freeDeliveryAt,config.promoMinimum))} de plats.`
 };
 return texts[key]||text;
}
function renderObjectives() {
 const list=(objectives[state.index]||[]).map(([key,text])=>[key,personalObjective(state.index,key,text)]);
 $('#objectives').hidden=!list.length;
 $('#objectives').innerHTML='<b>À vérifier dans ton application</b>'+list.map(([key,text])=>`<div class="objective ${(state.evidence[state.index]||[]).includes(key)?'checked':''}"><span>${(state.evidence[state.index]||[]).includes(key)?'✓':'○'}</span>${escapeHTML(text)}</div>`).join('');
}
function finishCurrent() {
 if(!state.completed.includes(state.index)) state.completed.push(state.index);
 save();
 $('#next').disabled=state.index===course.length-1;
 renderProgress();renderObjectives();
}
function renderProgress() {
 $('#export-app').disabled=!state.completed.includes(11)||!cleanSource();
 const covered=new Set([...state.completed,...state.skipped]);
 $('#progress').style.width=(covered.size/course.length*100)+'%';
 $('#progress-text').textContent=`${state.completed.length} objectifs validés${state.skipped.length?' · '+state.skipped.length+' rappels déjà maîtrisés':''}`;
}
function observe(index,key) {
 if(demo || creative || !cleanSource() || !record(state,index,key))return;
 save();
 if(index===state.index){
  renderObjectives();
  if(ready(state,index)) {
   finishCurrent();
   message(index===11?'Commande réussie ! Tu as construit et testé les règles de ton application.':'Code et essais réussis. Tu peux passer au prochain chantier.','success');
  } else message('Essai observé. Il reste un test à effectuer dans ton application.');
 }
}
function showCoaching() {
 const review=diagnosticFor(state.supportTargets[state.index] ?? state.index);
 const show=review!==null && (state.attempts[state.index]||0)>=2 && !state.diagnostics.includes(review);
 $('#coaching').hidden=!show;
 if(!show)return;
 const question=course[review];
 $('#coaching-question').textContent=question.task;
 $('#coaching-feedback').textContent='';
 $('#coaching-options').replaceChildren();
 question.options.forEach((text,i)=>{const button=document.createElement('button');button.textContent=text;button.onclick=()=>{
   if(i===question.answer){state.diagnostics.push(review);save();$('#coaching-feedback').textContent=question.why+' Reviens maintenant à ton code.';for(const b of $('#coaching-options').children)b.disabled=true;}
   else $('#coaching-feedback').textContent='Essaie avec les valeurs de l’exemple. '+question.hint;
 };$('#coaching-options').append(button);});
}
function renderLesson() {
  const actual=course[state.index];
  const m=creative?{...actual,title:'Fais-en ta création',concept:'Ton identité se programme aussi.',explanation:'Change ton nom, tes photos, ta présentation et tes couleurs dans le code. L’aperçu visuel réagit pendant que tu écris. Les boutons continuent d’utiliser ton dernier code vérifié.',task:'Modifie tes variables existantes. Tu peux ajouter tagline (ton slogan), accentColor (une couleur #RRGGBB), mainPhoto (burger, pizza, sushi ou tacos) et menuLayout (list, tiles ou spotlight). Applique tes choix pour vérifier que tout fonctionne.',hint:'Exemple à adapter :\nconst tagline = "Du piquant et du caractère.";\nconst accentColor = "#b91c55";\nconst mainPhoto = "tacos";',options:null,practice:null,kind:'ATELIER CRÉATIF'}:actual;
  $('#step-label').textContent=`MISSION ${String(state.index+1).padStart(2,'0')} / ${course.length} · ${chapters[m.chapter].slice(5)}`;
  $('#title').textContent=m.title; $('#time').textContent=`~ ${m.time} min`; $('#kind').textContent=m.kind; $('#concept').textContent=m.concept; $('#explanation').textContent=m.explanation; $('#task').textContent=m.task;
  $('#hint').hidden=!state.guidance[state.index]; $('#hint').textContent=state.guidance[state.index]||m.hint;
  renderObjectives();showCoaching();if(creative){$('#objectives').hidden=true;$('#coaching').hidden=true;}
  $('#code').value=state.source;
  $('#identity-guide').hidden=state.index!==0&&!creative;
  $('#creative-toggle').textContent=creative?'Revenir au TP':'Mon style'; $('#code').readOnly=!creative&&(!!m.options||!!m.practice);
  $('#edit-status').textContent=m.options||m.practice?'OBSERVE TON CODE':'À TOI DE JOUER';
  $('#quiz').hidden=!m.options; $('#quiz').replaceChildren(); selected=null;
  if(m.options) m.options.forEach((text,i)=>{const b=document.createElement('button');b.textContent=text;b.onclick=()=>{selected=i;for(const el of $('#quiz').children)el.classList.remove('selected');b.classList.add('selected');};$('#quiz').append(b);});
  $('#verify').textContent=creative?'Appliquer et tester ↗':m.options?'Vérifier ma réponse ↗':m.practice?'Vérifier mon expérience ↗':'Vérifier mon code ↗';
  $('#next').hidden=creative;
  $('#next').textContent=state.index===course.length-1?'Atelier terminé ✓':'Continuer →'; $('#next').disabled=!state.completed.includes(state.index)||state.index===course.length-1||!cleanSource();
  renderProgress();
  $('#chapters').replaceChildren(); chapters.forEach((name,i)=>{const first=course.findIndex(m=>m.chapter===i); const button=document.createElement('button'); const done=course.filter(m=>m.chapter===i).every(m=>state.completed.includes(course.indexOf(m))||state.skipped.includes(course.indexOf(m))); button.className=(m.chapter===i?'active ':'')+(done?'done':'');button.innerHTML=`<span class="chapter-number">${done?'✓':String(i+1).padStart(2,'0')}</span><span>${name.slice(5)}</span>`;button.disabled=first>state.unlocked;button.onclick=()=>{state.index=course.findIndex((item,n)=>item.chapter===i&&n<=state.unlocked&&!state.completed.includes(n)&&!state.skipped.includes(n));if(state.index<0)state.index=first;save();renderLesson();};$('#chapters').append(button);});
  updateLines(); if(m.seed){$('#code').scrollTop=$('#code').scrollHeight;$('#lines').scrollTop=$('#code').scrollTop;} message(storageWarning || (state.completed.includes(state.index)?'Étape validée. Tu peux continuer ou relire ton code.':'À toi : '+m.task),'');
}
async function verify() {
 if(busy||demo)return;
 busy=true;$('#verify').disabled=true;
 const index=state.index, source=state.source, m=course[index];
 try {
  if(m.options&&!creative) {
   if(selected===null)throw Error('Choisis une réponse avant de vérifier.');
   if(selected!==m.answer)throw Error('Pas encore. '+m.hint);
   if(!state.diagnostics.includes(index))state.diagnostics.push(index);
   finishCurrent();message(m.why,'success');
  } else {
   await run(source,allTests(creative?state.unlocked:index));
   if(state.source!==source||state.index!==index)return;
   const changed=state.verified!==source;
   if(creative&&!onlyVisualChange(state.verified,source)){
    state.completed=state.completed.filter(n=>n<index);state.skipped=state.skipped.filter(n=>n<index);
    for(const key of Object.keys(state.evidence))if(Number(key)>=index)delete state.evidence[key];
    state.finalOrder=false;
   }
   state.verified=source;draft=null;clearTimeout(draftTimer);
   config=await call('config');updateMenu();renderObjectives();
   delete state.guidance[index];$('#hint').hidden=true;$('#coaching').hidden=true;
   if(!m.practice && changed)page='menu';
   if(creative){save();message('Tes choix sont appliqués. Essaie ton appli, puis reviens au TP quand tu veux.','success');renderProgress();}
   else if(ready(state,index)) {
    finishCurrent();message(m.practice==='order'?'Bravo ! Ta commande de test est réussie.':'Ton code fonctionne. Le prochain chantier est disponible.','success');
   } else {
    save();renderObjectives();
    message('Ton code fonctionne. À toi de le mettre à l’épreuve dans le téléphone : suis les tests ci-dessus.','success');
   }
   $('#edit-status').textContent='CODE VÉRIFIÉ · À TOI DE TESTER';
   await renderPhone();
  }
 } catch(error) {
  state.attempts[index]=(state.attempts[index]||0)+1;
  const failedIndex=course.findIndex(item=>(item.tests||[]).some(test=>error.message.startsWith(test.key+'(')));
  const target=failedIndex<0?index:failedIndex;
  state.supportTargets[index]=target;
  state.guidance[index]=(target!==index?'Une règle précédente a été modifiée. ':'')+guidanceFor(target,state.attempts[index],error.message,course[target].hint);
  save();
  message(error.message,'error');
  $('#hint').textContent=state.guidance[index];$('#hint').hidden=false;
  showCoaching();
 } finally {busy=false;$('#verify').disabled=false;}
}
function phoneHeader(title,back=false) { return `<div class="app-top"><button data-action="${back?'menu':'location'}" class="location">${back?'← Retour':'⌖ Juvignac'} <span>${back?'':'▾'}</span></button><div class="avatar">JM</div></div>${title?`<h2 class="screen-title">${title}</h2>`:''}`; }
async function totals(){const lines=await Promise.all(menu.map((p,i)=>call('lineTotal',[p.price,quantities[i]])));const amount=await call('subtotal',lines.map(x=>x??0));const fee=amount?await call('deliveryFee',[amount]):0;const reduction=await call('discount',[applied,amount??0]);const total=await call('grandTotal',[amount??0,fee??0,reduction??0]);return {lines,amount,fee,reduction,total};}
async function renderPhone() {
 const rev=++revision;
 try {
 const capabilities=await call('capabilities')||{};
 config=await call('config');if(!demo&&draft)config={...config,...draft};updateMenu();
 $('.phone').dataset.theme=config.theme;$('.phone').dataset.menuLayout=config.menuLayout;
 $('.phone').dataset.customAccent=!!config.accentColor;
 $('.phone').style.setProperty('--student-accent',config.accentColor||'');$('.phone').style.setProperty('--student-on-accent',config.accentColor?accentText(config.accentColor):'');
 renderObjectives();if(creative)$('#objectives').hidden=true;
 const name=(!demo&&draft?.restaurantName)||await call('restaurantName')||'Ton restaurant'; const t=await totals(); if(rev!==revision)return;
 if(!demo && !capabilities.restaurantName&&!draft?.restaurantName){$('#phone-screen').innerHTML='<div class="empty-project"><span>＋</span><h3>Ton application commence ici.</h3><p>Écris sa première information dans ton fichier vide, puis vérifie ton code.</p></div>';$('#preview-status').innerHTML='<span class="live-dot"></span> Ton application · écris ta première ligne';renderedPage=null;return;}
 const count=quantities.reduce((a,b)=>a+b,0); const enabled=demo||!!state.verified; const escape=escapeHTML;
 let content='';
 if(page==='menu')content=phoneHeader('Une petite faim ?')+`<div class="search-visual">⌕ <span>Un bon repas, près de chez toi</span></div><div class="food-tabs"><span class="chosen">À la carte</span><span>${escape(cuisines[config.cuisine]?.label||'Ta spécialité')}</span><span>Fait maison</span></div><div class="restaurant-hero"><img src="assets/${menu[0].image}.jpg" alt="${escape(menu[0].name)}"><div class="hero-shade"></div><span class="hero-badge">LE COIN DES GOURMANDS</span><div class="hero-copy"><span>${escape(config.tagline)}</span><h3>${escape(name)}</h3></div></div><div class="restaurant-meta"><b>★ 4,8 <small>(128 avis fictifs)</small></b><span>20–30 min · ${t.fee===0&&t.amount?'Livraison offerte':`Livraison ${money(config.deliveryPrice)}`}</span></div><div class="menu-heading"><h3>Les incontournables</h3><span>3 pépites à goûter</span></div><div class="food-list">${menu.map((p,i)=>`<article class="food-item"><div class="food-copy"><span class="food-tag">${p.tag}</span><h4>${escape(p.name)}</h4><p>${escape(p.description)}</p><b>${money(p.price)}</b></div><div class="food-picture"><img src="assets/${p.image}.jpg" alt="${escape(p.name)}"><div class="quantity-controls"><button data-action="remove" data-item="${i}" aria-label="Retirer ${escape(p.name)}" ${!enabled?'disabled':''}>−</button><span>${quantities[i]}</span><button data-action="add" data-item="${i}" aria-label="Ajouter ${escape(p.name)}" ${!enabled?'disabled':''}>+</button></div></div></article>`).join('')}</div><div class="app-footer-label">BIEN MANGER. JUSTE À CÔTÉ.</div>`;
 else if(page==='cart') {
  if(!demo && cleanSource()){
   if(state.index===4 && quantities[0]===1 && Math.abs(t.lines[0]-config.mainPrice)<.001)observe(4,'line-one');
   if(state.index===4 && quantities[0]===2 && Math.abs(t.lines[0]-config.mainPrice*2)<.001)observe(4,'line-two');
   if(state.index===5 && quantities.filter(q=>q>0).length>=2)observe(5,'mixed');
   if(state.index>=6 && state.index<=7 && t.amount>0 && t.fee!==null)observe(7,t.amount>=config.freeDeliveryAt?'free':'paid');
   if(state.index===9 && applied===config.promoCode && t.reduction===config.promoValue && Math.abs(t.total-(t.amount+t.fee-config.promoValue))<.001)observe(9,'total-with-promo');
  }
  content=phoneHeader('Ton panier',true)+`<p class="cart-restaurant">${escape(name)} · Juvignac</p>${!count?'<div class="empty-state"><span>🛍</span><h3>Une faim de loup ?</h3><p>Ton panier attend ses premières pépites.</p><button data-action="menu">Découvrir les plats →</button></div>':`<div class="cart-items">${menu.map((p,i)=>quantities[i]?`<div class="cart-item"><img src="assets/${p.image}.jpg" alt=""><div><b>${escape(p.name)}</b><span>${money(p.price)} / pièce</span><div class="cart-quantity"><button data-action="remove" data-item="${i}" aria-label="Retirer ${escape(p.name)}">−</button><b>${quantities[i]}</b><button data-action="add" data-item="${i}" aria-label="Ajouter ${escape(p.name)}">+</button></div></div><strong>${t.lines[i]===null?'À coder':money(t.lines[i])}</strong></div>`:'').join('')}</div><div class="promo-box"><label for="promo">Un petit coup de pouce ?</label><div><input id="promo" placeholder="Code promo" value="${escape(promo)}" maxlength="20"><button data-action="promo">Appliquer</button></div><small>${applied?(t.reduction?`${money(t.reduction)} de réduction avec ${escape(applied)}.`:'Code inconnu, minimum non atteint ou règle à coder.'):`Ton code ${escape(config.promoCode)} offre ${money(config.promoValue)} dès ${money(config.promoMinimum)} de plats.`}</small></div><div class="receipt"><div><span>Sous-total</span><b>${t.amount===null?'À coder':money(t.amount)}</b></div><div><span>Livraison</span><b class="green">${t.fee===null?'À coder':t.fee===0?'Offerte':money(t.fee)}</b></div>${t.reduction?`<div><span>Réduction ${escape(config.promoCode)}</span><b>− ${money(t.reduction)}</b></div>`:''}<div class="receipt-total"><b>Total</b><strong>${t.total===null?'À coder':money(t.total)}</strong></div></div><p class="delivery-policy">${t.amount>=config.freeDeliveryAt?`Livraison offerte dès ${money(config.freeDeliveryAt)}.`:`Encore ${money(config.freeDeliveryAt-(t.amount||0))} pour ta livraison offerte.`}</p><p class="checkout-note">Commande fictive · aucun paiement demandé</p>`}`;
 } else content=phoneHeader('',true)+`<div class="order-success"><div class="success-seal">✓</div><span class="eyebrow">BIEN JOUÉ !</span><h2>Ça part en cuisine.</h2><p>Ta commande simulée est confirmée.<br>Et c’est ton code qui a fait le calcul.</p><div class="order-ticket"><span>JUVIGN’MIAM · #0042</span><h3>${escape(name)}</h3><div>${count} article${count>1?'s':''}<b>${money(t.total??0)}</b></div><p>Livraison fictive à Juvignac</p></div><div class="delivery-steps"><b>● Confirmée</b><span>● En préparation</span><span>○ À table !</span></div><button data-action="new" class="app-primary">Refaire un essai →</button></div>`;
 if(!demo && !capabilities.addQuantity && page==='menu')content=phoneHeader('Une petite faim ?')+`<div class="first-screen"><img src="assets/${menu[0].image}.jpg" alt="Ta spécialité"><span class="eyebrow">TON RESTAURANT</span><h3>${escape(name)}</h3><p>${escape(config.tagline)}</p><p>Le menu apparaîtra quand tu programmeras le bouton +.</p></div>`;
 $('#phone-screen').innerHTML=content;
 if(renderedPage!==page){$('#phone-screen').scrollTop=0;renderedPage=page;}
 if(page!=='success' && (demo||capabilities.addQuantity))$('#phone-screen').insertAdjacentHTML('beforeend',`<div class="phone-bottom"><button class="app-primary" data-action="${page==='cart'?'order':'cart'}" ${page==='cart'&&(!count||t.total===null)?'disabled':''}>${page==='cart'?'Confirmer la commande':`<span class="cart-count">${count}</span> Voir mon panier`}<b>${t.total!==null?money(t.total):t.amount!==null?money(t.amount):'À coder'} →</b></button></div>`);
 if(toast)$('#phone-screen').insertAdjacentHTML('beforeend',`<div class="phone-toast" role="status">${escape(toast)}</div>`);
 $('#demo-toggle').textContent='Voir la démo complète ↗';renderMode(); $('#preview-status').innerHTML=`<span class="live-dot"></span> ${demo?'Démo complète · essaie une commande !':state.source!==state.verified?'Aperçu de tes choix · code à vérifier':'Ton application · dernier code validé'}`;
 }catch(error){message('Aperçu : '+error.message,'error');}
}
let interactionQueue=Promise.resolve();
$('#phone-screen').addEventListener('input',event=>{if(event.target.id==='promo')promo=event.target.value;});
$('#phone-screen').addEventListener('click',event=>{
 const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
 const action=button.dataset.action,i=Number(button.dataset.item);
 interactionQueue=interactionQueue.then(async()=>{
 $('#phone-screen').setAttribute('aria-busy','true');
 try {
 toast='';
 if(action==='add'||action==='remove') { const previous=quantities[i]; const next=await call(action==='add'?'addQuantity':'removeQuantity',[previous]); if(next===null)toast='Cette règle n’est pas encore codée. À toi de jouer !';else if(Number.isInteger(next)&&next>=0&&next<=99)quantities[i]=next;else toast='La quantité doit être un nombre de 0 à 99.';
 if(!demo&&cleanSource()){
  if(state.index===1&&action==='add'&&quantities[0]>=2)observe(1,'add-two');
  if(state.index===2&&action==='remove'&&previous>0&&next===previous-1)observe(2,'remove-one');
  if(state.index===2&&action==='remove'&&previous===0&&next===0)observe(2,'zero');
 }
 }
 if(action==='location')toast='Livraison simulée à Juvignac · aucun compte nécessaire.';
 if(action==='cart'||action==='menu')page=action;
 if(action==='promo'){applied=promo.trim();const t=await totals();if(state.index===8&&!demo&&cleanSource()){if(applied!==config.promoCode&&t.amount>=config.promoMinimum&&t.reduction===0)observe(8,'promo-rejected');if(applied===config.promoCode&&t.amount<config.promoMinimum&&t.reduction===0)observe(8,'promo-small');if(applied===config.promoCode&&t.amount>=config.promoMinimum&&t.reduction===config.promoValue)observe(8,'promo-accepted');}}
 if(action==='new'){quantities=[0,0,0];promo=applied='';page='menu';}
 if(action==='order') {const t=await totals();if(quantities.some(q=>q>0)&&t.total!==null){page='success';if(!demo&&state.source===state.verified&&course[state.index].practice==='order'&&t.amount>=Math.max(config.freeDeliveryAt,config.promoMinimum)&&applied===config.promoCode&&t.reduction===config.promoValue){state.finalOrder=true;observe(11,'order');}}}
 await renderPhone();
 }catch(error){message(error.message,'error');}finally{$('#phone-screen').setAttribute('aria-busy','false');}
 });
});
$('#code').addEventListener('input',()=>{
 const previous=state.source;state.source=$('#code').value;
 if(!creative&&!onlyVisualChange(previous,state.source)){
  state.finalOrder=false;state.observed=[];state.completed=state.completed.filter(n=>n<state.index);state.skipped=state.skipped.filter(n=>n<state.index);
  for(const key of Object.keys(state.evidence))if(Number(key)>=state.index)delete state.evidence[key];
 }
 renderObjectives();if(creative)$('#objectives').hidden=true;renderProgress();save();updateLines();
 $('#next').disabled=true;$('#edit-status').textContent='MODIFICATIONS NON VÉRIFIÉES';$('#preview-status').textContent='Aperçu de tes choix · code à vérifier';
 clearTimeout(draftTimer);draftTimer=setTimeout(()=>{if(demo)return;draft=visualDraft(state.source);renderPhone();},320);
});
$('#code').addEventListener('scroll',()=>{$('#lines').scrollTop=$('#code').scrollTop;});
$('#code').addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();const el=event.target;el.setRangeText('  ',el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input'));}});
document.addEventListener('keydown',event=>{if(!demo&&(event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();verify();}});
$('#verify').onclick=verify;
$('#hint-button').onclick=()=>{$('#hint').hidden=!$('#hint').hidden;if(!$('#hint').hidden){state.hints=(state.hints||0)+1;save();}};
$('#next').onclick=()=>{
 if(!state.completed.includes(state.index)||state.index>=course.length-1)return;
 let skipped=[];
 do {
  state.index++;
  if(course[state.index].options && !needsReview(state,state.index)) {if(!state.skipped.includes(state.index))state.skipped.push(state.index);skipped.push('rappel déjà maîtrisé');}
  else if(course[state.index].practice==='delivery' && ready(state,state.index)){if(!state.completed.includes(state.index))state.completed.push(state.index);skipped.push('essais de livraison déjà réalisés');}
  else break;
 }while(state.index<course.length-1);
 state.unlocked=Math.max(state.unlocked,state.index);
 const seed=course[state.index].seed;const name=seed.match(/function (\w+)/)?.[1];if(seed&&(!name||!state.source.includes('function '+name+'(')))state.source+=prepareSeed(state.source,seed);
 save();renderLesson();
 if(skipped.length)message('Tu passes directement à la suite : '+skipped.join(' et ')+'.','success');
};
$('#creative-toggle').onclick=()=>{creative=!creative;renderLesson();$('#code').focus();};
$('#undo').onclick=()=>{if(!confirm('Restaurer le dernier code validé ? Les modifications non vérifiées seront perdues.'))return;state.source=state.verified||course[0].seed;draft=null;clearTimeout(draftTimer);const m=course[state.index];if(m.seed&&!state.source.includes(m.seed.split('\n').find(s=>s.startsWith('function '))||'const restaurantName'))state.source+=prepareSeed(state.source,m.seed);save();renderLesson();renderPhone();};
async function enterDemo() {
 await interactionQueue;
 demo=true;state.demoSession=true;state.introVersion=2;
 quantities=[0,0,0];page='menu';promo=applied=toast='';
 save();if($('#welcome').open)$('#welcome').close();renderMode();await renderPhone();
}
$('#demo-toggle').onclick=enterDemo;
$('#try-demo').onclick=enterDemo;
$('#welcome').addEventListener('cancel',event=>event.preventDefault());
$('#exit-demo').onclick=async()=>{
 await interactionQueue;
 demo=false;state.demoSession=false;state.started=true;state.introVersion=2;
 quantities=[0,0,0];page='menu';promo=applied=toast='';
 save();renderMode();renderLesson();await renderPhone();
};
$('#backup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='juvign-miam-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Sauvegarde exportée : elle contient ton code et ta progression.','success');};
$('#export-code').onclick=()=>{const blob=new Blob([state.source],{type:'text/javascript'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='application.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#export-app').onclick=async()=>{
 if(!state.completed.includes(11)||!cleanSource())return;
 const source=state.verified;$('#export-app').disabled=true;
 try {
  await run(source,allTests(course.length-1));
  const savedConfig=await run(source,[],{method:'config'}),name=await run(source,[],{method:'restaurantName'});
  const currentConfig=config;config=savedConfig;updateMenu();const savedMenu=menu.map(item=>({...item}));config=currentConfig;updateMenu();
  const html=await createStandalone({source,config:savedConfig,name,menu:savedMenu,specialty:cuisines[savedConfig.cuisine].label,onAccent:savedConfig.accentColor?accentText(savedConfig.accentColor):'#ffffff'});
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download=(name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')||'my-restaurant')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message('Ton application est exportée ! Ouvre le fichier HTML : les photos, le panier et ton code fonctionnent hors ligne.','success');
 }catch(error){message('Export impossible : '+error.message,'error');}finally{renderProgress();}
};
$('#restore').onclick=()=>$('#file').click();
$('#file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>150000)throw Error('Ce fichier est trop volumineux.');const data=JSON.parse(await file.text());if(!validBackup(data))throw Error('Ce fichier n’est pas une sauvegarde compatible.');if(!confirm('Remplacer ton travail actuel par cette sauvegarde ?'))return;await run(data.verified,allTests(data.completed.length?Math.min(...[data.index,data.unlocked]):0).filter(t=>data.verified.includes(t.key)));state=normalizeProgress(data);if(state.personalizationVersion!==1&&state.verified){state.source=migrateSource(state.source);state.verified=migrateSource(state.verified);state.personalizationVersion=1;}state.demoSession=false;demo=false;renderMode();quantities=[0,0,0];page='menu';save();renderLesson();await renderPhone();message('Sauvegarde importée.','success');}catch(error){message('Import impossible : '+error.message,'error');}finally{event.target.value='';}};
$('#reset').onclick=()=>{if(confirm('Recommencer tout l’atelier ? Exporte ton travail si tu veux le garder.')){try{localStorage.removeItem(storageKey);}catch{}location.reload();}};
renderMode();renderLesson();renderPhone();if(!state.started&&!demo)$('#welcome').showModal();
