import {steps,components,specialties,newProject,validProject,addQuantity,removeQuantity,lineTotal,cartTotals,deliveryCases,promoCases,ready,invalidate,generateCode} from './blocks.js';
import {accentText} from './identity.js';
import {createStandalone} from './export-app.js';
const $=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=v=>Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const key='juvign-miam-blocks-v2';
let project=newProject(),storageWarning='';
try{const saved=JSON.parse(localStorage.getItem(key));if(validProject(saved))project=saved;}catch{storageWarning='Pense à sauvegarder ton projet avec le bouton Sauvegarder.';}
let demo=false,demoProject=null,page='menu',promo='',applied='',selected=null,dragged=null,deliveryResults=null,promotionResults=null,invalidFields=new Set();
const tokens={
 target:[{id:'quantity',label:'Quantité du plat',kind:'target'}],
 action:[{id:'increment',label:'Ajouter 1',kind:'action'},{id:'double',label:'Multiplier par 2',kind:'action'},{id:'reset',label:'Remettre à zéro',kind:'action'}],
 guard:[{id:'zero',label:'Ne jamais descendre sous 0',kind:'guard'}],
 operator:[{id:'multiply',label:'×',kind:'operator'},{id:'plus',label:'+',kind:'operator'},{id:'subtract',label:'−',kind:'operator'}],
 comparison:[{id:'gte',label:'≥',kind:'comparison'},{id:'gt',label:'>',kind:'comparison'}],
 join:[{id:'and',label:'ET',kind:'join'},{id:'or',label:'OU',kind:'join'}]
};
const current=()=>demo?demoProject:project;
const complete=p=>steps.every((_,i)=>ready(p,i));
function save(){try{localStorage.setItem(key,JSON.stringify(project));}catch{storageWarning='Sauvegarde locale indisponible : télécharge une sauvegarde.';}}
function say(text,type=''){const el=$('#test-result');el.className='test-result '+type;el.textContent=text;}
function stageSay(text){$('#stage-feedback').textContent=text;}
function eligible(){for(let i=0;i<8;i++)if(!ready(project,i))return i;return 7;}
function refreshChallenge(){
 const i=project.index,done=ready(project,i)&&!invalidFields.size;
 if(done&&!project.completed.includes(i)){project.completed.push(i);save();}
 if(!done)project.completed=project.completed.filter(n=>n!==i);
 $('#challenge-number').textContent=String(i+1).padStart(2,'0');$('#challenge-kind').textContent='DÉFI '+(i+1)+' / 8';$('#challenge-title').textContent=steps[i].title;$('#challenge-text').textContent=steps[i].verb;
 $('#challenge-state').textContent=done?(i===7?'TP terminé':'Défi validé'):invalidFields.size?'Vérifie le champ indiqué.':'';$('#challenge-state').className=done?'achieved':'';
 $('#next').disabled=!done||i===7;$('#next').textContent=i===7?'Terminé ✓':'Suite →';$('#download').disabled=!complete(project)||!!invalidFields.size;
 $('#journey').replaceChildren();steps.forEach((step,n)=>{const b=document.createElement('button');b.innerHTML=`<span>${ready(project,n)?'✓':n+1}</span>${esc(step.title)}`;b.className=(n===i?'current ':'')+(ready(project,n)?'finished':'');b.disabled=n>eligible();b.onclick=()=>{project.index=n;page='menu';selected=null;invalidFields.clear();say('');save();render();};$('#journey').append(b);});
 if($('#code-dialog').open)$('#generated-code').textContent=generateCode(project);
}
const field=(label,path,value,type='text',extra='')=>`<label class="field">${label}</label><input class="field-input" type="${type}" data-field="${path}" value="${esc(value)}" ${extra}>`;
const card=t=>`<button class="logic-card ${selected?.kind===t.kind&&selected?.id===t.id?'selected':''}" draggable="true" data-token-kind="${t.kind}" data-token-id="${t.id}" data-kind="${t.kind==='target'?'variable':t.kind==='comparison'||t.kind==='guard'||t.kind==='join'?'condition':t.kind}">${esc(t.label)}</button>`;
function slot(kind,value,label){const token=tokens[kind].find(t=>t.id===value);return `<button class="slot ${token?'filled':''}" data-slot="${kind}" aria-label="${label}">${token?esc(token.label):esc(label)}${token?'<small>Cliquer pour débrancher</small>':''}</button>`;}
function renderBank(){
 const i=project.index;let title='',html='',hint='Glisse un bloc sur son emplacement, ou clique pour le brancher.';
 if(i===0){title='Choisis ta spécialité';html=`<div class="specialty-options">${Object.entries(specialties).map(([id,s])=>`<button class="specialty-option ${project.specialty===id?'selected':''}" data-specialty="${id}"><img src="assets/${s.image}.jpg" alt="${s.label}"><span>${s.label}</span></button>`).join('')}</div>`;hint='Choisis une photo, puis renseigne le nom à droite.';}
 if(i===1){title='Les éléments';html=components.map(c=>`<button class="part-card ${project.components.includes(c.id)?'placed':''}" draggable="true" data-component="${c.id}"><span>${project.components.includes(c.id)?'✓':c.symbol}</span><div><b>${c.label}</b><small>${c.description}</small></div></button>`).join('');hint='Glisse vers le téléphone. Tu peux aussi cliquer sur un élément.';}
 if(i===2){title='Les photos';html=`<div class="specialty-options">${['burger','pizza','sushi','tacos','fries','drink'].map(id=>`<button class="specialty-option" data-dish-photo="${id}"><img src="assets/${id}.jpg" alt="${esc(specialties[id]?.label|| (id==='fries'?'Frites':'Boisson'))}"><span>${esc(specialties[id]?.label||(id==='fries'?'Frites':'Boisson'))}</span></button>`).join('')}</div><p class="mini-note">Clique une photo pour ton plat principal. Les autres photos se choisissent à droite.</p>`;hint='Les noms, les prix et les photos viennent de tes choix.';}
 if(i===3){title='Tes blocs d’action';html='<div class="slot-label">UNE VARIABLE</div>'+tokens.target.map(card).join('')+'<div class="slot-label">UNE ACTION</div>'+tokens.action.map(card).join('');}
 if(i===4){title='Le bloc de protection';html=`<div class="bug-card">Mission : trouver le bug.<strong>2 → 1 → 0 → ?</strong>Retire encore un plat quand le panier est vide.</div>${tokens.guard.map(card).join('')}`;}
 if(i===5){title='Choisis ton opération';html=tokens.operator.map(card).join('')+'<p class="mini-note">Le même calcul doit fonctionner pour tous les plats.</p>';}
 if(i===6){title='La comparaison';html=tokens.comparison.map(card).join('')+'<div class="bug-card">À la limite exacte,<br>la livraison est déjà offerte.</div>';}
 if(i===7){title='Relie tes conditions';html=tokens.join.map(card).join('')+'<p class="mini-note">Le code doit être correct et le minimum doit être atteint.</p>';}
 $('#bank-title').textContent=title;$('#bank').innerHTML=html;$('#drag-hint').textContent=hint;
}
function probes(results,kind){return results?results.map(c=>`<div class="probe ${Math.abs(c.actual-c.expected)<.001?'pass':'fail'}"><span>${kind==='delivery'?money(c.amount):`${esc(c.code)} · ${money(c.amount)}`}</span><b>${Math.abs(c.actual-c.expected)<.001?'✓':'✕'} ${money(c.actual)}</b></div>`).join(''):'';}
function renderInspector(){
 const i=project.index,p=project;let title='',html='';
 if(i===0){title='Donne-lui une identité';html=field('Le nom de ton restaurant','name',p.name,'text','maxlength="35" placeholder="Ex. Pixel Pizza"')+field('Ton slogan (facultatif)','tagline',p.tagline,'text','maxlength="60" placeholder="Ton idée en quelques mots"')+'<label class="field">Ton ambiance</label><div class="color-options">'+[['sunset','#ff5a2e'],['arcade','#a635bc'],['ocean','#087e88']].map(([id,color])=>`<button data-theme="${id}" class="${p.theme===id?'selected':''}" style="background:${color}" aria-label="Ambiance ${id}"></button>`).join('')+`<input type="color" data-field="accent" value="${p.accent}" aria-label="Ta couleur personnelle"><label class="field">Ta présentation</label><div class="layout-options">${[['list','Liste'],['tiles','Mosaïque'],['spotlight','À la une']].map(([id,label])=>`<button data-layout="${id}" class="${p.layout===id?'selected':''}">${label}</button>`).join('')}</div>`;}
 if(i===1){title='Ordre des éléments';html=`<p class="mini-note">Réorganise les éléments placés. Le bouton du panier reste accessible en bas.</p>${p.components.length?p.components.map((id,n)=>`<div class="arranged-item"><span>${components.find(c=>c.id===id).label}</span><button data-move="${n}" data-delta="-1" ${n===0?'disabled':''} aria-label="Monter ${id}">↑</button><button data-move="${n}" data-delta="1" ${n===p.components.length-1?'disabled':''} aria-label="Descendre ${id}">↓</button><button data-delete="${id}" aria-label="Retirer ${id}">✕</button></div>`).join(''):'<div class="board"><p class="mini-note">Ajoute un élément depuis la colonne de gauche.</p></div>'}`;}
 if(i===2){title='À la carte';html=p.menu.map((dish,n)=>`<div class="dish-editor"><div class="dish-editor-head"><img src="assets/${dish.image}.jpg" alt=""><span>${['PLAT PRINCIPAL','ACCOMPAGNEMENT','BOISSON'][n]}</span></div><input class="field-input" data-field="menu.${n}.name" value="${esc(dish.name)}" maxlength="35" placeholder="${specialties[p.specialty].suggestions[n]}" aria-label="Nom ${n+1}"><div class="field-row"><label for="price-${n}">Prix en €</label><input id="price-${n}" type="number" min="1" max="25" step="0.5" data-field="menu.${n}.price" value="${dish.price}" aria-label="Prix ${n+1}"></div><select class="field-input" data-field="menu.${n}.image" aria-label="Photo ${n+1}">${['burger','pizza','sushi','tacos','fries','drink'].map(id=>`<option value="${id}" ${dish.image===id?'selected':''}>${specialties[id]?.label||(id==='fries'?'Frites':'Boisson')}</option>`).join('')}</select></div>`).join('');}
 if(i===3){title='Branche le bouton';html=`<div class="board"><div class="event-block">QUAND<br>on clique sur « Ajouter »</div><div class="flow-arrow">↓</div><div class="slot-label">QU’EST-CE QUI CHANGE ?</div>${slot('target',p.add.target,'Une variable')}<div class="flow-arrow">↓</div><div class="slot-label">COMMENT ?</div>${slot('action',p.add.action,'Une action')}</div><div class="live-values"><span>Quantité du premier plat</span><b id="live-quantity">${p.quantities[0]}</b></div><p class="mini-note">Teste ton branchement avec + dans le téléphone.</p>`;}
 if(i===4){title='Repère, puis répare';html=`<div class="bug-card">${p.evidence.sawNegative?'✓ Bug observé : une quantité de −1.':'Vide le panier, puis clique encore sur −.'}</div><div class="board"><div class="event-block">QUAND<br>on retire un article</div><div class="flow-arrow">↓</div>${slot('guard',p.guard?'zero':null,'Ajoute une protection')}</div><div class="live-values"><span>Quantité actuelle</span><b id="live-quantity">${p.quantities[0]}</b></div><p class="mini-note">Après la réparation, clique sur − à zéro pour vérifier.</p>`;}
 if(i===5){title='Calcul du prix';html=`<div class="board"><div class="slot-label">PRIX DE LA LIGNE</div><div class="equation"><span>prix</span>${slot('operator',p.operator,'?')}<span>quantité</span></div></div><div class="live-values"><span>Un plat à ${money(p.menu[0].price)} × 2</span><b>${money(lineTotal(p,p.menu[0].price,2))}</b></div><p class="mini-note">Teste deux exemplaires de ton plat principal, puis ouvre le panier.</p>`;}
 if(i===6){title='Ton offre de livraison';html=`<div class="board"><div class="event-block">SI le montant du panier…</div><div class="rule-line">panier ${slot('comparison',p.delivery.comparator,'?')} <input type="number" min="10" max="50" step="1" data-field="delivery.threshold" value="${p.delivery.threshold}" aria-label="Seuil de livraison"> €</div><div class="rule-outcome">ALORS livraison offerte : 0 €</div><div class="rule-outcome otherwise">SINON <input type="number" min="1" max="6" step="0.1" data-field="delivery.fee" value="${p.delivery.fee}" aria-label="Frais de livraison"> € de livraison</div></div><button class="test-button" data-action="test-delivery">Tester la limite →</button><div id="delivery-probes">${probes(deliveryResults,'delivery')}</div>`;}
 if(i===7){title=ready(p,7)?'Exporter l’application':'Condition de promotion';html=(ready(p,7)?'<div class="completion-stamp"><span>✓</span><h3>TP terminé.</h3><p>Le fichier HTML permet d’ouvrir ton application hors ligne.</p><button data-action="export">Télécharger mon appli ↓</button></div>':'')+`<div class="board"><div class="event-block">SI les deux conditions sont reliées…</div><div class="rule-line">code = <input type="text" data-field="promo.code" value="${esc(p.promo.code)}" maxlength="12" placeholder="TONCODE" aria-label="Ton code promo"></div>${slot('join',p.promo.join,'ET ou OU ?')}<div class="rule-line">panier ≥ <input type="number" min="5" max="35" step="1" data-field="promo.minimum" value="${p.promo.minimum}" aria-label="Minimum de promotion"> €</div><div class="rule-outcome">ALORS réduction de <input type="number" min="1" max="8" step="0.5" data-field="promo.value" value="${p.promo.value}" aria-label="Montant de réduction"> €</div><div class="rule-outcome otherwise">SINON réduction : 0 €</div></div><button class="test-button" data-action="test-promo">Tester ma promotion →</button><div id="promo-probes">${probes(promotionResults,'promo')}</div><p class="mini-note">Puis confirme une commande qui atteint tes deux seuils, avec ton code promo.</p>`;}
 if(i===7&&ready(p,7)){const split=html.indexOf('</div>')+6;html=html.slice(0,split)+'<details class="finished-rule"><summary>Revoir ma promotion</summary>'+html.slice(split)+'</details>';}
 $('#builder-title').textContent=title;$('#inspector').innerHTML=html;
}
function menuTitle(p){return p.name.trim()||'Ton restaurant';}
function dishName(p,i){return p.menu[i].name.trim()||specialties[p.specialty].suggestions[i];}
function phoneHeader(p,back=false){return `<div class="app-top"><button class="location" data-phone-action="${back?'menu':'location'}">${back?'← Retour':'⌖ Juvignac'}</button><div class="avatar">${esc(menuTitle(p).slice(0,2).toUpperCase())}</div></div>`;}
function renderPhone(){
 const p=current(),q=p.quantities,t=cartTotals(p,q,applied),count=q.reduce((a,b)=>a+b,0),screen=$('#phone-screen'),oldScroll=screen.scrollTop;
 $('#phone').dataset.theme=p.theme;$('#phone').dataset.menuLayout=p.layout;$('#phone').dataset.customAccent=true;$('#phone').style.setProperty('--student-accent',p.accent);$('#phone').style.setProperty('--student-on-accent',accentText(p.accent));
 let html=phoneHeader(p,page!=='menu');
 if(!demo&&project.index===0){html+=`<div class="welcome-restaurant"><img src="assets/${p.menu[0].image}.jpg" alt="Ta spécialité"><h3>${esc(menuTitle(p))}</h3><p>${esc(p.tagline||'')}</p></div>`;}
 else if(page==='menu'){
  if(!p.components.length)html+='<div class="drop-canvas" data-canvas="true"><span>＋</span><h3>Écran vide</h3><p>Glisse un élément ici<br>pour le voir apparaître.</p></div>';
  const chunks={
   title:`<h2 class="screen-title">${esc(menuTitle(p))}</h2>`,
   photo:`<div class="restaurant-hero"><img src="assets/${p.menu[0].image}.jpg" alt="${esc(dishName(p,0))}"><div class="hero-shade"></div><span class="hero-badge">${esc(specialties[p.specialty].label.toUpperCase())}</span><div class="hero-copy"><span>${esc(p.tagline||'')}</span><h3>${esc(menuTitle(p))}</h3></div></div>`,
   menu:`<div class="menu-heading"><h3>Ta carte</h3></div><div class="food-list">${p.menu.map((dish,i)=>`<article class="food-item"><div class="food-copy"><span class="food-tag">${i?'LE BON DUO':'TA SIGNATURE'}</span><h4>${esc(dishName(p,i))}</h4><p>${['Préparé à ta façon.','Pour accompagner ton repas.','Une pause fraîche.'][i]}</p><b>${money(dish.price)}</b></div><div class="food-picture"><img src="assets/${dish.image}.jpg" alt="${esc(dishName(p,i))}"><div class="quantity-controls"><button data-phone-action="remove" data-item="${i}" aria-label="Retirer ${esc(dishName(p,i))}">−</button><span>${q[i]}</span><button data-phone-action="add" data-item="${i}" aria-label="Ajouter ${esc(dishName(p,i))}">+</button></div></div></article>`).join('')}</div>`
  };
  for(const id of p.components)if(chunks[id])html+=`<section class="component-shell ${!demo&&project.index===1?'designing':''}">${!demo&&project.index===1?`<span class="component-tag">${esc(components.find(c=>c.id===id).label)}</span>`:''}${chunks[id]}</section>`;
  if(!demo&&project.index===1&&p.components.length<4)html+='<div class="design-drop" data-canvas="true">＋ Glisse un autre élément ici</div>';
 }else if(page==='cart'){
  html+=`<h2 class="screen-title">Ton panier</h2><p class="cart-restaurant">${esc(menuTitle(p))}</p>`;
  if(count<0||q.some(n=>n<0))html+='<div class="studio-banner bad">Une quantité négative ? Tu viens de trouver le bug !</div>';
  html+=count!==0||q.some(n=>n!==0)?`<div class="cart-items">${p.menu.map((dish,i)=>q[i]!==0?`<div class="cart-item"><img src="assets/${dish.image}.jpg" alt=""><div><b>${esc(dishName(p,i))}</b><span>${money(dish.price)} / pièce</span><div class="cart-quantity"><button data-phone-action="remove" data-item="${i}" aria-label="Retirer ${esc(dishName(p,i))}">−</button><b>${q[i]}</b><button data-phone-action="add" data-item="${i}" aria-label="Ajouter ${esc(dishName(p,i))}">+</button></div></div><strong>${p.operator?money(t.lines[i]):'À connecter'}</strong></div>`:'').join('')}</div>`:'<div class="empty-state"><h3>Ton panier est vide.</h3><button data-phone-action="menu">Choisir un plat →</button></div>';
  if(p.operator)html+=`<div class="receipt"><div><span>Plats</span><b>${money(t.amount)}</b></div><div><span>Livraison</span><b>${t.fee?money(t.fee):'Offerte'}</b></div>${t.reduction?`<div><span>Réduction ${esc(applied)}</span><b>− ${money(t.reduction)}</b></div>`:''}<div class="receipt-total"><b>Total</b><strong>${money(t.total)}</strong></div></div>`;
  if(p.promo.join||!demo&&project.index===7)html+=`<div class="promo-box"><label for="phone-promo">Ton code promo</label><div><input id="phone-promo" value="${esc(promo)}" placeholder="Ton code"><button data-phone-action="promo">Appliquer</button></div><small>${applied?(t.reduction?money(t.reduction)+' de réduction.':'Code ou montant non accepté.'):'Applique ton offre avant de confirmer.'}</small></div>`;
  if(!demo&&project.index>=6)html+=`<p class="delivery-policy">Livraison offerte dès ${money(p.delivery.threshold)}.</p>`;
 }else html+=`<div class="order-success"><div class="success-seal">✓</div><h2>Commande confirmée.</h2><div class="order-ticket"><span>TON RESTAURANT</span><h3>${esc(menuTitle(p))}</h3><div>${count} articles<b>${money(t.total)}</b></div></div><button class="app-primary" data-phone-action="new">Refaire un essai →</button></div>`;
 screen.innerHTML=html;screen.scrollTop=oldScroll;
 if(p.components.includes('cart')&&page!=='success'&&(demo||project.index>0))screen.insertAdjacentHTML('beforeend',`<div class="phone-bottom"><button class="app-primary" data-phone-action="${page==='cart'?'order':'cart'}" ${page==='cart'&&(!p.operator||count<=0||q.some(n=>n<0))?'disabled':''}>${page==='cart'?'Confirmer la commande':`<span class="cart-count">${count}</span> Voir mon panier`}<b>${p.operator?money(t.total):'À connecter'} →</b></button></div>`);
 $('#stage-mode').textContent=!demo&&project.index===1?'PLACER LES ÉLÉMENTS':'ESSAYER TON APPLICATION';
 if($('#live-quantity'))$('#live-quantity').textContent=q[0];
}
function render(){renderBank();renderInspector();refreshChallenge();renderPhone();}
function setPage(next){page=next;$('#phone-screen').scrollTop=0;renderPhone();}
function connect(kind,id){
 if(!tokens[kind]?.some(t=>t.id===id))return;
 if(kind==='guard'&&!project.evidence.sawNegative){say('Teste d’abord le bouton − à zéro pour repérer le bug.','error');return;}
 selected={kind,id};
 if(kind==='target'){invalidate(project,3);project.add.target=id;}
 if(kind==='action'){invalidate(project,3);project.add.action=id;}
 if(kind==='guard'){const seen=project.evidence.sawNegative;invalidate(project,4);project.evidence.sawNegative=seen;project.guard=true;project.quantities=project.quantities.map(q=>Math.max(0,q));}
 if(kind==='operator'){invalidate(project,5);project.operator=id;}
 if(kind==='comparison'){invalidate(project,6);project.delivery.comparator=id;deliveryResults=null;}
 if(kind==='join'){invalidate(project,7);project.promo.join=id;promotionResults=null;}
 save();say('');render();
}
function addComponent(id){if(!components.some(c=>c.id===id)||project.components.includes(id))return;project.components.push(id);save();render();stageSay('');}
document.addEventListener('dragstart',event=>{const el=event.target.closest('[draggable="true"]');if(!el)return;dragged=el.dataset.component?{component:el.dataset.component}:{kind:el.dataset.tokenKind,id:el.dataset.tokenId};event.dataTransfer.setData('text/plain',JSON.stringify(dragged));event.dataTransfer.effectAllowed='copy';});
document.addEventListener('dragover',event=>{const el=event.target.closest('[data-slot],#phone-screen');if(el&&dragged&&(dragged.component&&el.id==='phone-screen'||dragged.kind===el.dataset.slot)){event.preventDefault();el.classList.add('drop-over');}});
document.addEventListener('dragleave',event=>event.target.closest('.drop-over')?.classList.remove('drop-over'));
document.addEventListener('dragend',()=>{dragged=null;for(const el of document.querySelectorAll('.drop-over'))el.classList.remove('drop-over');});
document.addEventListener('drop',event=>{const el=event.target.closest('[data-slot],#phone-screen');if(!el||!dragged)return;event.preventDefault();el.classList.remove('drop-over');if(dragged.component&&el.id==='phone-screen'&&project.index===1)addComponent(dragged.component);else if(dragged.kind===el.dataset.slot)connect(dragged.kind,dragged.id);dragged=null;});
function updateField(input){
 const path=input.dataset.field;if(!path)return;
 let value=input.value;
 if(input.type==='number'){
  const minimum=Number(input.min),maximum=Number(input.max),number=Number(value);
  if(value===''||!Number.isFinite(number)||number<minimum||number>maximum||Math.abs(number*100-Math.round(number*100))>.0001){invalidFields.add(path);input.style.borderColor='#e0633e';refreshChallenge();return;}
  value=number;
 }
 if(path==='promo.value'&&value>=project.promo.minimum||path==='promo.minimum'&&value<=project.promo.value){invalidFields.add(path);input.style.borderColor='#e0633e';say('Le minimum doit être supérieur à la réduction.','error');refreshChallenge();return;}
 invalidFields.delete(path);input.style.borderColor='';
 const parts=path.split('.');let object=project;for(const part of parts.slice(0,-1))object=object[part];object[parts.at(-1)]=value;
 if(path.startsWith('delivery.')){invalidate(project,6);deliveryResults=null;$('#delivery-probes')?.replaceChildren();}
 if(path.startsWith('promo.')){invalidate(project,7);promotionResults=null;$('#promo-probes')?.replaceChildren();}
 if(path.startsWith('menu.')){invalidate(project,5);}
 save();refreshChallenge();renderPhone();
}
document.addEventListener('input',event=>{if(event.target.matches('[data-field]'))updateField(event.target);if(event.target.id==='phone-promo')promo=event.target.value;});
document.addEventListener('change',event=>{if(event.target.matches('select[data-field]')){updateField(event.target);renderInspector();}});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.component){addComponent(button.dataset.component);return;}
 if(button.dataset.tokenKind){connect(button.dataset.tokenKind,button.dataset.tokenId);return;}
 if(button.dataset.slot){const kind=button.dataset.slot;if(kind==='target')project.add.target=null;if(kind==='action')project.add.action=null;if(kind==='operator')project.operator=null;if(kind==='guard')project.guard=false;if(kind==='comparison')project.delivery.comparator=null;if(kind==='join')project.promo.join=null;invalidate(project,{target:3,action:3,guard:4,operator:5,comparison:6,join:7}[kind]);save();render();return;}
 if(button.dataset.specialty){project.specialty=button.dataset.specialty;project.menu[0].image=specialties[project.specialty].image;save();renderBank();refreshChallenge();renderPhone();return;}
 if(button.dataset.theme){project.theme=button.dataset.theme;project.accent={sunset:'#ff5a2e',arcade:'#a635bc',ocean:'#087e88'}[project.theme];save();renderInspector();renderPhone();return;}
 if(button.dataset.layout){project.layout=button.dataset.layout;save();renderInspector();renderPhone();return;}
 if(button.dataset.dishPhoto){project.menu[0].image=button.dataset.dishPhoto;save();renderInspector();renderPhone();return;}
 if(button.dataset.move!==undefined){const from=Number(button.dataset.move),to=from+Number(button.dataset.delta);[project.components[from],project.components[to]]=[project.components[to],project.components[from]];save();render();return;}
 if(button.dataset.delete){project.components=project.components.filter(id=>id!==button.dataset.delete);project.completed=project.completed.filter(n=>n!==1);save();render();return;}
 if(button.dataset.action==='test-delivery'){
  if(invalidFields.size){say('Complète les valeurs de ta règle avant de tester.','error');return;}
  deliveryResults=deliveryCases(project);project.evidence.deliveryTest=deliveryResults.every(c=>Math.abs(c.actual-c.expected)<.001);save();renderInspector();refreshChallenge();say(project.evidence.deliveryTest?'Tes trois essais passent, même à la limite exacte.':'À ton seuil exact, le client doit déjà avoir la livraison offerte.',''+(project.evidence.deliveryTest?'success':'error'));return;
 }
 if(button.dataset.action==='test-promo'){
  if(invalidFields.size||!project.promo.code.trim()){say('Choisis ton code et complète les valeurs avant de tester.','error');return;}
  promotionResults=promoCases(project);project.evidence.promoTest=promotionResults.every(c=>Math.abs(c.actual-c.expected)<.001);save();renderInspector();refreshChallenge();say(project.evidence.promoTest?'Ta règle fonctionne. Passe maintenant une commande avec ton code.':'Un seul critère vrai ne doit pas suffire. Regarde le test qui échoue.',project.evidence.promoTest?'success':'error');return;
 }
 if(button.dataset.action==='export'){await exportApp();return;}
 const action=button.dataset.phoneAction;if(!action)return;
 const p=current(),i=Number(button.dataset.item),before=p.quantities[i];
 if(action==='add'){
  p.quantities[i]=Math.min(99,addQuantity(p,before));
  if(!demo&&project.index===3&&p.add.target==='quantity'&&p.add.action==='increment'&&p.quantities[0]>=2)project.evidence.addTest=true;
  stageSay(p.add.target&&p.add.action?(p.quantities[i]!==before?`Quantité : ${before} → ${p.quantities[i]}.`:'Le clic ne change pas la quantité. Regarde la variable branchée.'):'Ce bouton attend son action. Branche tes blocs.');
 }
 if(action==='remove'){
  p.quantities[i]=Math.max(-1,removeQuantity(p,before));
  if(!demo&&p.quantities[i]<0){project.evidence.sawNegative=true;stageSay('−1 article ! Tu viens de trouver le bug du panier.');}
  if(!demo&&project.index===4&&p.guard&&before===0&&p.quantities[i]===0){project.evidence.zeroTest=true;stageSay('Cette fois, la quantité reste à zéro. Bug réparé !');}
 }
 if(action==='cart'||action==='menu'){page=action;$('#phone-screen').scrollTop=0;}
 if(action==='cart'&&!demo&&project.index===5&&p.operator==='multiply'&&p.quantities[0]===2){project.evidence.lineTest=true;stageSay('Deux exemplaires, deux fois le prix : ton calcul fonctionne.');}
 if(action==='promo')applied=promo.trim();
 if(action==='new'){page='menu';p.quantities=[0,0,0];promo=applied='';$('#phone-screen').scrollTop=0;}
 if(action==='order'&&p.quantities.some(q=>q>0)){
  const t=cartTotals(p,p.quantities,applied);page='success';$('#phone-screen').scrollTop=0;
  if(!demo&&project.index===7&&project.evidence.promoTest&&applied===p.promo.code&&t.amount>=Math.max(p.delivery.threshold,p.promo.minimum)&&t.reduction===p.promo.value&&t.fee===0){project.evidence.orderTest=true;stageSay('Commande validée. Tu peux télécharger ton application.');renderInspector();}
  else if(!demo&&project.index===7)stageSay('Commande reçue. Pour ton défi, atteins tes deux seuils et applique ta promotion.');
 }
 if(action==='location')stageSay('Une commande fictive à Juvignac. Aucun paiement.');
 if(!demo){if(project.index===4)renderInspector();save();refreshChallenge();}renderPhone();
});
$('#next').onclick=()=>{if(!ready(project,project.index)||invalidFields.size||project.index===7)return;project.index++;page='menu';$('#phone-screen').scrollTop=0;promo=applied='';selected=null;deliveryResults=null;promotionResults=null;say('');stageSay('');save();render();};
function enterDemo(){demoProject=newProject();Object.assign(demoProject,{name:'Juvign’Burger',started:true,components:components.map(c=>c.id),guard:true,operator:'multiply',add:{target:'quantity',action:'increment'},delivery:{comparator:'gte',threshold:20,fee:2.9},promo:{code:'MIAM',minimum:15,value:3,join:'and'}});demoProject.menu=[{name:'Le Smash du coin',price:9.9,image:'burger'},{name:'Frites bien dorées',price:4.5,image:'fries'},{name:'La pause fraîche',price:3.5,image:'drink'}];demo=true;page='menu';promo=applied='';document.body.classList.add('demo-mode');$('#exit-demo').hidden=false;$('#exit-demo').textContent=project.started?'Quitter la démo et reprendre mon appli →':'Quitter la démo et construire mon appli →';if($('#welcome').open)$('#welcome').close();renderPhone();}
$('#demo').onclick=enterDemo;$('#try-demo').onclick=enterDemo;$('#welcome').addEventListener('cancel',event=>event.preventDefault());
$('#exit-demo').onclick=()=>{demo=false;document.body.classList.remove('demo-mode');$('#exit-demo').hidden=true;project.started=true;page='menu';promo=applied='';save();render();};
$('#view-code').onclick=()=>{$('#generated-code').textContent=generateCode(project);$('#code-dialog').showModal();};$('#close-code').onclick=()=>$('#code-dialog').close();
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#download-code').onclick=()=>download(generateCode(project),'text/javascript','my-restaurant.js');
$('#backup').onclick=()=>{save();download(JSON.stringify(project,null,2),'application/json','my-no-code-restaurant.json');say('Ton projet et tes blocs sont sauvegardés.','success');};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>150000)throw Error('Fichier trop volumineux.');const data=JSON.parse(await file.text());if(!validProject(data))throw Error('Choisis une sauvegarde du studio no-code.');if(!confirm('Remplacer le projet ouvert par cette sauvegarde ?'))return;project=data;invalidFields.clear();page='menu';promo=applied='';deliveryResults=promotionResults=null;save();render();say('Projet restauré.','success');}catch(error){say(error.message,'error');}finally{event.target.value='';}};
$('#restart').onclick=()=>{if(confirm('Recommencer le TP ? Sauvegarde ton projet pour le conserver.')){project=newProject();invalidFields.clear();save();page='menu';render();$('#welcome').showModal();}};
async function exportApp(){
 if(!complete(project)||invalidFields.size)return;
 $('#download').disabled=true;
 try{
  const p=project,config={cuisine:p.specialty,theme:p.theme,menuLayout:p.layout,accentColor:p.accent,tagline:p.tagline||'',mainPhoto:p.menu[0].image,mainName:p.menu[0].name,mainPrice:p.menu[0].price,sideName:p.menu[1].name,sidePrice:p.menu[1].price,drinkName:p.menu[2].name,drinkPrice:p.menu[2].price,freeDeliveryAt:p.delivery.threshold,deliveryPrice:p.delivery.fee,promoCode:p.promo.code,promoMinimum:p.promo.minimum,promoValue:p.promo.value};
  const menu=p.menu.map((dish,i)=>({...dish,tag:i?'LE BON DUO':'TA SIGNATURE',description:['Préparé à ta façon.','Pour accompagner ton repas.','Une pause fraîche.'][i]}));
  const html=await createStandalone({source:generateCode(p),config,name:p.name,menu,components:p.components,specialty:specialties[p.specialty].label,onAccent:accentText(p.accent)});
  download(html,'text/html',(p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')||'my-restaurant')+'.html');say('Ton application est téléchargée. Le fichier HTML fonctionne hors ligne.','success');
 }catch(error){say('Export impossible : '+error.message,'error');}finally{refreshChallenge();}
}
$('#download').onclick=exportApp;
render();if(storageWarning)say(storageWarning);if(!project.started)$('#welcome').showModal();
