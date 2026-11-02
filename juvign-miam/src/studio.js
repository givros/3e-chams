import {catalog,actionTypes,uid,blankProject,component,variable,walk,findNode,duplicateNode,operand,action,restaurantTemplate,tasksTemplate,validateProject} from './studio-model.js';
import {createPlayer,playerCSS} from './studio-player.js';
import {screenTemplates,addScreenTemplate} from './screen-templates.js';
import {encodeProject} from './share.js';
import {projectIssues} from './studio-diagnostics.js';
import {columnLayout,moveNode} from './studio-layout.js';
import {navigationSettings,setNavigation,cleanNavigation} from './studio-navigation.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoNames={burger:'Burger',pizza:'Pizza',sushi:'Sushis',tacos:'Tacos',fries:'Frites',drink:'Boisson'};
const typeLabels={text:'Texte',number:'Nombre',boolean:'Oui / non',list:'Liste',computed:'Calcul'};
const storageKey='juvign-miam-studio-v3';let project=blankProject(),loadMessage='';
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(validateProject(saved))project=saved;}catch{loadMessage='Sauvegarde locale indisponible.';}
walk(project,n=>{const match=String(n.props.text||'').match(/^(.*?)\{\{(\w+)\}\}$/);if(match&&!n.props.textVariable&&project.variables.some(v=>v.name===match[2])){n.props.text=match[1];n.props.textVariable=match[2];}});
for(const v of project.variables)for(const f of v.fields||[])if(f.type==='text'&&v.initial?.some(item=>typeof item?.[f.name]==='string'&&/^(assets\/|data:image\/)/.test(item[f.name])))f.type='image';
let screenId=project.home,selectedId=null,selectedVariable=null,libraryTab='components',inspectorTab='props',eventName='click',mode='design',actionPath=null,history=[],future=[],lastEdit='',lastEditTime=0,dragItem=null,uploadTarget=null,player,lastState={};
const style=document.createElement('style');style.textContent=playerCSS;document.head.append(style);
function save(){try{localStorage.setItem(storageKey,JSON.stringify(project));$('#save-status').textContent='Enregistré sur cet ordinateur';}catch{$('#save-status').textContent='Stockage plein : télécharge le projet JSON.';}$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;}
function snapshot(key=''){const now=Date.now();if(!key||key!==lastEdit||now-lastEditTime>900){history.push(JSON.stringify(project));if(history.length>30)history.shift();}lastEdit=key;lastEditTime=now;future=[];}
function commit(mutator,{redraw=true,key=''}={}){snapshot(key);const screens=new Set(project.screens.map(s=>s.id));mutator();if(project.navigation?.enabled)for(const s of project.screens)if(!screens.has(s.id))project.navigation.items.push(s.id);cleanNavigation(project);save();if(redraw)renderAll();else{renderScreensPicker();renderLibrary();refreshPlayer();renderIssues();}}
function safeGet(object,path){return path.split('.').reduce((value,key)=>['__proto__','constructor','prototype'].includes(key)?undefined:value?.[key],object);}
function safeSet(object,path,value){const keys=path.split('.');if(keys.some(k=>['__proto__','constructor','prototype'].includes(k)))return;for(const key of keys.slice(0,-1)){if(object[key]===undefined)object[key]={};object=object[key];}object[keys.at(-1)]=value;}
function selected(){return selectedVariable?project.variables.find(v=>v.name===selectedVariable):findNode(project,selectedId)?.node;}
function currentScreen(){return project.screens.find(s=>s.id===screenId)||project.screens[0];}
function option(value,label,current){return `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;}
function selectInput(path,value,items,extra=''){return `<select class="full" data-path="${path}" ${extra}>${items.map(item=>option(Array.isArray(item)?item[0]:item,Array.isArray(item)?item[1]:item,value)).join('')}</select>`;}
function input(path,value,type='text',extra=''){return `<input class="full" type="${type}" data-path="${path}" value="${esc(value)}" ${extra}>`;}
function field(label,content){return `<label class="field-label">${label}</label>${content}`;}
function variablesOptions(type=null){return [['','— Choisir —'],...project.variables.filter(v=>!type||v.type===type).map(v=>[v.name,v.label||v.name])];}
function addNode(type,columns=0){if(!columns&&!catalog.some(c=>c.type===type))return;commit(()=>{const info=findNode(project,selectedId),parent=info?.node.type==='container'?info.node:info?.parent?.type==='container'?info.parent:null,node=columns?columnLayout(project,columns):component(type,project);(parent?parent.children:currentScreen().nodes).push(node);selectedId=node.id;selectedVariable=null;inspectorTab='props';eventName=['list','products'].includes(node.type)?'item':['input','number','textarea','select','toggle'].includes(node.type)?'change':'click';});}
function selectNode(id){selectedId=id;selectedVariable=null;inspectorTab='props';const found=findNode(project,id);if(found){screenId=found.screen.id;eventName=['list','products'].includes(found.node.type)?'item':['input','number','textarea','select','toggle'].includes(found.node.type)?'change':'click';}renderInspector();renderLibrary();player?.select(id);}
function renderScreensPicker(){$('#project-name').value=project.name;$('#screen-picker').innerHTML=project.screens.map(s=>option(s.id,s.name,screenId)).join('');}
function treeHTML(nodes,depth=0){return nodes.map(n=>`<button class="tree-row ${n.id===selectedId?'active':''}" draggable="true" data-move-node="${n.id}" ${n.type==='container'?`data-player-drop="${n.id}"`:''} data-select-node="${n.id}" style="padding-left:${8+depth*13}px">${esc(n.name)}<small>${catalog.find(c=>c.type===n.type)?.label||''}</small></button>${treeHTML(n.children||[],depth+1)}`).join('');}
function renderLibrary(){
 for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===libraryTab);
 let html='';
 if(libraryTab==='models')html=`<div class="section-label">Ajouter un écran · ${screenTemplates.length} modèles</div><div class="screen-model-list">${screenTemplates.map(t=>`<button data-screen-model="${t.id}">${t.image?`<img src="assets/${t.image}.jpg" alt="">`:`<b class="model-icon" style="background:${t.color}">${esc(t.icon)}</b>`}<strong>${esc(t.name)}</strong><span>${esc(t.description)}</span></button>`).join('')}</div>`;
 if(libraryTab==='components')html=`<div class="section-label">Ajouter un composant</div><div class="component-grid"><button class="component-button" draggable="true" data-add-columns="2"><span>&#9637;</span><b>2 colonnes</b></button><button class="component-button" draggable="true" data-add-columns="3"><span>&#9637;</span><b>3 colonnes</b></button>${catalog.map(c=>`<button class="component-button" draggable="true" data-add-component="${c.type}"><span>${c.icon}</span><b>${c.label}</b></button>`).join('')}</div><p class="help">Glisse un élément dans l’écran ou un conteneur. Un clic l’ajoute aussi.</p><div class="section-label">Structure de l’écran</div><div class="tree">${treeHTML(currentScreen().nodes)}</div>`;
 if(libraryTab==='screens')html=`<div class="section-label">Écrans</div>${project.screens.map(s=>`<div class="screen-row ${s.id===screenId?'active':''}"><button data-open-screen="${s.id}">${s.id===project.home?'⌂ ':''}${esc(s.name)}</button><button data-screen-settings="${s.id}" aria-label="Réglages de ${esc(s.name)}">⚙</button></div>`).join('')}<button class="outline-button" data-add-screen>＋ Ajouter un écran</button><div class="section-label" style="margin-top:25px">Structure</div>${treeHTML(currentScreen().nodes)}`;
 if(libraryTab==='data')html=`<div class="section-label">Variables de l’application</div>${project.variables.map(v=>`<button class="data-row" data-select-variable="${v.name}"><strong>${esc(v.label||v.name)}</strong><span class="type-chip">${esc(typeLabels[v.type])}</span></button>`).join('')}<div class="data-create"><label class="field-label">Nouvelle variable</label><input id="variable-name" placeholder="Ex. score, nom, produits"><select id="variable-type">${[['text','Texte'],['number','Nombre'],['boolean','Oui / non'],['list','Liste'],['computed','Calcul']].map(([v,l])=>option(v,l,'text')).join('')}</select><button class="solid-button" data-create-variable>Créer</button></div>`;
 if(libraryTab==='actions')html=`<div class="section-label">Blocs d’action</div><div class="action-palette">${actionTypes.map(([type,label])=>`<button class="${type==='if'?'if-block':''}" draggable="true" data-add-action="${type}">${type==='if'?'◇':'↳'} ${label}</button>`).join('')}</div><p class="help">Sélectionne un composant, puis dépose les blocs dans son événement. Un clic ajoute le bloc à la fin.</p>`;
 if(libraryTab==='screens'){
  const nav=navigationSettings(project);
  html+=`<section class="navigation-config"><div class="section-label">Menu de l’application</div><label class="toggle-row">Afficher un menu<input type="checkbox" data-navigation-prop="enabled" ${nav.enabled?'checked':''}></label>${nav.enabled?`<label class="field-label">Présentation</label><select class="full" data-navigation-prop="style">${option('tabs','Onglets en bas',nav.style)}${option('drawer','Menu latéral ☰',nav.style)}</select><label class="toggle-row">Barre de titre<input type="checkbox" data-navigation-prop="showHeader" ${nav.showHeader?'checked':''}></label><label class="toggle-row">Flèche de retour<input type="checkbox" data-navigation-prop="showBack" ${nav.showBack?'checked':''}></label><label class="field-label">Écrans dans le menu</label>${project.screens.map(s=>`<label class="nav-screen-choice"><input type="checkbox" data-navigation-item="${s.id}" ${nav.items.includes(s.id)?'checked':''}><span>${esc(s.name)}</span></label>`).join('')}`:''}</section>`;
 }
 $('#library-content').innerHTML=html;
}
function operandUI(path,v={kind:'literal',value:''},depth=0){
 let body=selectInput(path+'.kind',v.kind||'literal',[['literal','Une valeur que je choisis'],['variable','Une donnée de mon appli'],['input','Ce qui vient d’être saisi'],['item','L’élément cliqué'],['cartTotal','Le total d’un panier'],['length','Le nombre d’éléments'],['math','Un calcul']],`data-operand-kind="${path}"`);
 if(v.kind==='variable'||v.kind==='cartTotal'||v.kind==='length')body+=selectInput(path+'.name',v.name,variablesOptions(v.kind==='variable'?null:'list'));
 else if(v.kind==='item')body+=input(path+'.field',v.field||'','text','placeholder="Champ (vide : élément entier)"');
 else if(v.kind==='math'&&depth<8)body+=operandUI(path+'.a',v.a,depth+1)+selectInput(path+'.op',v.op,[['add','＋'],['subtract','−'],['multiply','×'],['divide','÷']])+operandUI(path+'.b',v.b,depth+1);
 else if(v.kind==='literal'||!v.kind)body+=input(path+'.value',v.value??'','text','placeholder="Valeur"');
 return `<div class="operand">${body}</div>`;
}
function actionsUI(list,path,depth=0){
 if(depth>15)return '<p class="help">Ouvre un bloc moins imbriqué pour le modifier.</p>';
 const cards=(list||[]).map((a,i)=>{const base=path+'.'+i;let fields='';
 if(['set','increment','append','remove','cartAdd'].includes(a.type))fields+=field(a.type==='append'||a.type==='remove'||a.type==='cartAdd'?'Liste à modifier':'Donnée à modifier',selectInput(base+'.variable',a.variable,variablesOptions(a.type==='increment'?'number':['append','remove','cartAdd'].includes(a.type)?'list':null)));
 if(['set','increment','append','remove','cartAdd'].includes(a.type))fields+=`<button class="action-insert" data-quick-variable="${base}.variable" data-quick-type="${a.type==='increment'?'number':['append','remove','cartAdd'].includes(a.type)?'list':'text'}">＋ Créer une donnée</button>`;
 if(a.type==='set'||a.type==='append'||a.type==='toast')fields+=field(a.type==='toast'?'Message':'Valeur',operandUI(base+'.value',a.value));
 if(a.type==='increment')fields+=field('Ajouter (nombre négatif pour retirer)',input(base+'.delta',a.delta??1,'number','step="any"'));
 if(a.type==='cartAdd')fields+=field('Quantité',input(base+'.quantity',a.quantity||1,'number','min="1"'));
 if(a.type==='remove')fields+='<p class="help">Retire l’élément cliqué dans une liste.</p>';
 if(a.type==='navigate')fields+=field('Écran de destination',selectInput(base+'.screen',a.screen,project.screens.map(s=>[s.id,s.name])));
 if(a.type==='if'){
  fields+=(a.conditions||[]).map((c,j)=>`<div class="condition">${operandUI(base+'.conditions.'+j+'.left',c.left)}${selectInput(base+'.conditions.'+j+'.op',c.op,[['eq','est égal à'],['neq','est différent de'],['gt','est supérieur à'],['gte','est supérieur ou égal à'],['lt','est inférieur à'],['lte','est inférieur ou égal à'],['contains','contient'],['empty','est vide']])}${c.op==='empty'?'':operandUI(base+'.conditions.'+j+'.right',c.right)}<button class="action-insert" data-delete-condition="${base+'.conditions.'+j}">Retirer cette condition</button></div>`).join('');
  fields+=selectInput(base+'.join',a.join||'and',[['and','Toutes les conditions (ET)'],['or','Au moins une condition (OU)']])+`<button class="action-insert" data-add-condition="${base}">＋ Condition</button><div class="branch"><strong>ALORS</strong>${actionsUI(a.then||[],base+'.then',depth+1)}</div><div class="branch else"><strong>SINON</strong>${actionsUI(a.else||[],base+'.else',depth+1)}</div>`;
 }
 return `<div class="action-card ${a.type==='if'?'if-card':''}"><div class="action-heading"><span>${i+1}. ${esc(actionTypes.find(t=>t[0]===a.type)?.[1]||a.type)}</span><button data-move-action="${base}" data-delta="-1" ${i===0?'disabled':''}>↑</button><button data-move-action="${base}" data-delta="1" ${i===(list.length-1)?'disabled':''}>↓</button><button data-delete-action="${base}" aria-label="Supprimer l’action">✕</button></div>${fields}</div>`;
 }).join('');
 return `<div class="action-target" data-action-target="${path}">${cards||'<p class="help">Déposer une action ici</p>'}<select class="add-action-picker" data-insert-action="${path}"><option value="">＋ Ajouter une action</option>${actionTypes.map(([v,l])=>option(v,l,'')).join('')}</select></div>`;
}
function renderNodeProps(n){
 let html=field('Nom du composant',input('name',n.name));const x=n.props;
 if(['heading','text','button','back'].includes(n.type))html+=field('Texte',`<textarea data-path="props.text">${esc(x.text)}</textarea>`)+field('Afficher une donnée après le texte',selectInput('props.textVariable',x.textVariable||'',variablesOptions()))+`<details class="advanced"><summary>Texte avec plusieurs données</summary><select class="inline-pick" data-insert-binding="props.text"><option value="">Insérer une donnée…</option>${project.variables.map(v=>option(v.name,v.label||v.name,'')).join('')}</select><p class="help">Les données entre doubles accolades seront remplacées à l’exécution.</p></details>`;
 if(['button','back'].includes(n.type)){
  const destination=n.events.click.find(a=>a.type==='navigate'||a.type==='back');
  html+=field('Au clic, ouvrir',`<select class="full" data-button-navigation>${option('','Aucun écran (autres actions)',destination?.screen||destination?.type||'')}${option('back','← L’écran précédent',destination?.type)}${project.screens.map(s=>option(s.id,s.name,destination?.screen)).join('')}</select>`);
 }
 if(n.type==='image')html+=`<img class="selected-image" src="${esc(x.src)}" alt="">${field('Texte alternatif',input('props.alt',x.alt||''))}${field('Hauteur',input('props.height',x.height,'number','min="20" max="1200"'))}${field('Cadrage',selectInput('props.fit',x.fit,[['cover','Remplir'],['contain','Afficher en entier']]))}<div class="asset-bank">${['burger','pizza','sushi','tacos','fries','drink'].map(id=>`<button data-pick-image="assets/${id}.jpg" class="${x.src==='assets/'+id+'.jpg'?'selected':''}"><img src="assets/${id}.jpg" alt="${photoNames[id]}"></button>`).join('')}</div><button class="image-upload-button" data-upload-image>Importer une image</button>`;
 if(['input','number','textarea','select','toggle'].includes(n.type))html+=field('Libellé',input('props.label',x.label||''))+field('Enregistrer la saisie dans',selectInput('props.variable',x.variable,variablesOptions(n.type==='number'?'number':n.type==='toggle'?'boolean':'text')))+(n.type==='toggle'?'':field('Texte indicatif',input('props.placeholder',x.placeholder||'')))+(n.type==='select'?field('Options (une par ligne)',`<textarea data-path="props.options">${esc(x.options)}</textarea>`):'');
 if(n.type==='container'){
  html+=field('Disposition',selectInput('props.direction',x.direction,[['column','Empilés'],['row','Côte à côte'],['grid','En colonnes']]))+field('Espacement entre éléments',input('style.gap',n.style.gap,'number','min="0" max="100"'));
  if(x.direction==='grid')html+=field('Nombre de colonnes',selectInput('props.columns',x.columns||2,[['2','2 colonnes'],['3','3 colonnes'],['4','4 colonnes']]))+field('Largeur des colonnes',selectInput('props.columnWidths',x.columnWidths||'1,1',[['1,1','Largeurs égales'],['2,1','Première colonne plus large'],['1,2','Deuxième colonne plus large']]));
 }
 if(n.type==='spacer')html+=field('Hauteur',input('props.height',x.height,'number','min="0" max="1000"'));
 if(['list','products','cart'].includes(n.type))html+=field('Liste de données',selectInput('props.variable',x.variable,variablesOptions('list')));
 if(n.type==='list')html+=field('Texte à afficher',selectInput('props.itemText',x.itemText,[['{{item}}','L’élément complet'],...((project.variables.find(v=>v.name===x.variable)?.fields)||[]).map(f=>['{{item.'+f.name+'}}',f.label||f.name])]))+`<details class="advanced"><summary>Texte personnalisé</summary>${input('props.itemText',x.itemText)}</details><label class="toggle-row">Bouton de suppression<input type="checkbox" data-path="props.removable" ${x.removable?'checked':''}></label>`;
 if(n.type==='list'||n.type==='products')html+=field('Bouton par élément (facultatif)',input('props.itemButton',x.itemButton||''))+field('Message de liste vide',input('props.empty',x.empty||''));
 if(n.type==='products'){
  const fields=project.variables.find(v=>v.name===x.variable)?.fields||[],choices=[['','— Champ —'],...fields.map(f=>[f.name,f.label||f.name])];
  html+='<details class="advanced"><summary>Relier les champs de la liste</summary>'+field('Champ du nom',selectInput('props.nameField',x.nameField,choices))+field('Champ du prix',selectInput('props.priceField',x.priceField,choices))+field('Champ de l’image',selectInput('props.imageField',x.imageField,choices))+'</details>';
 }
 if(n.type==='cart')html+=field('Frais de livraison',input('props.delivery',x.delivery,'number','min="0" step="0.1"'))+field('Livraison offerte dès (0 : désactivé)',input('props.freeAt',x.freeAt,'number','min="0" step="1"'))+field('Donnée contenant la réduction',selectInput('props.discountVariable',x.discountVariable,variablesOptions('number')))+field('Texte du bouton',input('props.checkout',x.checkout));
 html+='<hr class="mini-divider"><div class="section-label">Apparence</div><div class="form-row">'+field('Taille du texte',input('style.fontSize',n.style.fontSize,'number','min="8" max="72"'))+field('Alignement',selectInput('style.align',n.style.align,[['left','Gauche'],['center','Centre'],['right','Droite']]))+'</div>';
 html+='<div class="form-row">'+field('Couleur du texte',input('style.color',n.style.color||project.theme.text,'color'))+field('Couleur du fond',input('style.background',n.style.background||currentScreen().background,'color'))+'</div>';
 html+='<details class="advanced"><summary>Dimensions et affichage</summary><div class="form-row">'+field('Marge intérieure',input('style.padding',n.style.padding,'number','min="0" max="100"'))+field('Largeur',selectInput('style.width',n.style.width,['100%','75%','50%','auto']))+'</div>'+field('Arrondi',input('style.radius',n.style.radius,'number','min="0" max="80"'))+field('Afficher seulement si cette donnée est vraie',selectInput('props.visibleVariable',x.visibleVariable||'',variablesOptions()))+'</details>';
 return html+`<div class="prop-actions"><button data-node-op="up">↑ Monter</button><button data-node-op="down">↓ Descendre</button><button data-node-op="duplicate">Dupliquer</button><button class="danger" data-node-op="delete">Supprimer</button></div>`;
}
function variableEditor(v){
 let html=field('Nom de la donnée',input('label',v.label||v.name))+field('Type',`<input class="full" value="${esc(typeLabels[v.type])}" readonly>`)+`<details class="advanced"><summary>Identifiant technique</summary>${input('name',v.name,'text','readonly')}<button class="outline-button" data-rename-variable>Renommer l’identifiant</button></details>`;
 if(v.type==='computed')html+=field('Calcul',operandUI('formula',v.formula||operand('literal',0)));
 else if(v.type==='number')html+=field('Valeur initiale',input('initial',v.initial,'number','step="any"'));
 else if(v.type==='boolean')html+=field('Valeur initiale',selectInput('initial',String(v.initial),[['true','Vrai'],['false','Faux']],'data-boolean="true"'));
 else if(v.type==='text')html+=field('Valeur initiale',`<textarea data-path="initial">${esc(v.initial)}</textarea>`);
 else{
  html+='<hr class="mini-divider"><div class="section-label">Champs des éléments</div>'+(v.fields||[]).map((f,i)=>`<div class="form-row"><input value="${esc(f.label||f.name)}" data-column-label="${i}"><button class="outline-button" data-delete-column="${i}">Retirer</button></div>`).join('')+`<div class="form-row"><input id="new-column-name" placeholder="nom, prix, image…"><select id="new-column-type"><option value="text">Texte</option><option value="number">Nombre</option><option value="image">Image</option><option value="boolean">Oui / non</option></select></div><button class="outline-button" data-add-column style="margin-top:7px">＋ Champ</button>`;
  html+='<hr class="mini-divider"><div class="section-label">Éléments initiaux</div>'+v.initial.map((item,i)=>`<div class="record"><div class="record-heading"><span>Élément ${i+1}</span><button class="record-delete" data-delete-record="${i}">✕</button></div>${(v.fields||[]).length?(v.fields||[]).map(f=>field(esc(f.label||f.name),f.type==='image'?`<select data-record-field="${i}" data-record-key="${esc(f.name)}">${[['','Aucune image'],...(String(item?.[f.name]||'').startsWith('data:image/')?[[item[f.name],'Image importée']]:[]),...['burger','pizza','sushi','tacos','fries','drink'].map(id=>['assets/'+id+'.jpg',photoNames[id]])].map(([value,label])=>option(value,label,item?.[f.name])).join('')}</select><button class="image-upload-button" data-upload-record="${i}" data-record-key="${esc(f.name)}">Importer une image</button>`:f.type==='boolean'?`<select data-record-field="${i}" data-record-key="${esc(f.name)}" data-record-type="boolean">${option('true','Vrai',String(item?.[f.name]))}${option('false','Faux',String(item?.[f.name]))}</select>`:`<input type="${f.type==='number'?'number':'text'}" data-record-field="${i}" data-record-key="${esc(f.name)}" value="${esc(item?.[f.name]??'')}" step="any">`)).join(''):`<input data-record-field="${i}" value="${esc(typeof item==='object'?JSON.stringify(item):item)}">`}</div>`).join('')+'<button class="outline-button" data-add-record>＋ Élément</button>';
 }
 return html+'<div class="prop-actions"><button class="danger" data-delete-variable>Supprimer la variable</button></div>';
}
function renderInspector(){
 const n=selected();$('#props-tab').classList.toggle('active',inspectorTab==='props');$('#events-tab').classList.toggle('active',inspectorTab==='actions');$('#events-tab').disabled=!!selectedVariable||!n;
 let html='';
 if(selectedVariable&&n){$('#inspector-title').textContent=n.label||n.name;html=variableEditor(n);}
 else if(n){$('#inspector-title').textContent=n.name;
  if(inspectorTab==='actions'){
   const events=[['click','Quand on clique'],...(['input','number','textarea','select','toggle'].includes(n.type)?[['change','Quand la valeur change']]:[]),...(['list','products'].includes(n.type)?[['item','Quand on clique un élément']]:[])];
   if(!events.some(([v])=>v===eventName))eventName=events[0][0];actionPath='events.'+eventName;
   html=`<div class="event-picker"><label>Quand ?</label><select id="event-picker">${events.map(([v,l])=>option(v,l,eventName)).join('')}</select></div>${actionsUI(n.events[eventName]||[],actionPath)}`;
  }else html=renderNodeProps(n);
 }else{
  $('#inspector-title').textContent=currentScreen().name;
  html=field('Nom de l’écran',`<input class="full" data-screen-prop="name" value="${esc(currentScreen().name)}">`)+field('Fond de l’écran',`<input class="full" type="color" data-screen-prop="background" value="${esc(currentScreen().background||project.theme.background)}">`)+`<button class="outline-button" data-set-home style="margin-top:15px">${project.home===screenId?'⌂ Écran de démarrage':'Définir comme écran de démarrage'}</button><hr class="mini-divider"><div class="section-label">Apparence de l’application</div>`+field('Couleur principale',`<input class="full" type="color" data-theme-prop="primary" value="${project.theme.primary}">`)+field('Couleur du texte',`<input class="full" type="color" data-theme-prop="text" value="${project.theme.text}">`)+field('Arrondi des boutons',`<input class="full" type="number" min="0" max="60" data-theme-prop="radius" value="${project.theme.radius}">`)+`<div class="prop-actions"><button data-duplicate-screen>Dupliquer l’écran</button><button data-delete-screen class="danger" ${project.screens.length===1?'disabled':''}>Supprimer l’écran</button></div>`;
 }
 if(!n&&!selectedVariable)html+=`<details class="advanced"><summary>Nom et icône dans le menu</summary>${field('Nom court',`<input class="full" data-screen-prop="menuLabel" placeholder="${esc(currentScreen().name)}" value="${esc(currentScreen().menuLabel||'')}">`)}${field('Icône',`<select class="full" data-screen-prop="menuIcon">${[['⌂','Maison'],['▦','Grille'],['♥','Cœur'],['★','Étoile'],['☷','Liste'],['●','Rond'],['＋','Plus'],['☺','Profil'],['▣','Panier']].map(([v,l])=>option(v,v+' '+l,currentScreen().menuIcon||'●')).join('')}</select>`)}</details>`;
 $('#inspector-content').innerHTML=html;
}
function issues(){return projectIssues(project);}
function renderIssues(){const list=issues();$('#issues-button').textContent=list.length?list.length+' liaison'+(list.length>1?'s':'')+' à vérifier':'';$('#issues-button').className=list.length?'warning':'';}
function refreshPlayer(){
 try{player.update(project,{design:mode==='design',selected:selectedId,screen:screenId,reset:mode==='design'});}catch(error){$('#canvas-status').textContent=error.message;return;}
 $('#canvas-status').textContent=(mode==='design'?'Conception':'Test')+' · '+currentScreen().name;
 $('#design-mode').classList.toggle('active',mode==='design');$('#test-mode').classList.toggle('active',mode==='test');
}
function renderAll(){renderScreensPicker();renderLibrary();renderInspector();if(player)refreshPlayer();renderIssues();}
function insertAction(type,path=null){const n=findNode(project,selectedId)?.node;if(!n){$('#canvas-status').textContent='Sélectionne un composant pour lui ajouter une action.';return;}commit(()=>{inspectorTab='actions';if(!path)path='events.'+eventName;let list=safeGet(n,path);if(!Array.isArray(list)){safeSet(n,path,[]);list=safeGet(n,path);}list.push(action(type,project));});}
function addScreen(){commit(()=>{const s={id:uid('screen'),name:'Écran '+(project.screens.length+1),background:project.theme.background,nodes:[]};project.screens.push(s);screenId=s.id;selectedId=selectedVariable=null;});}
function mutateProperty(input,redraw=false){const target=selected();if(!target)return;const path=input.dataset.path;let next=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.dataset.boolean==='true'?input.value==='true':input.value;if(input.type==='number'){if(!Number.isFinite(next))return;if(input.min!=='')next=Math.max(Number(input.min),next);if(input.max!=='')next=Math.min(Number(input.max),next);}
 commit(()=>{
  if(input.dataset.operandKind){next=operand(next,next==='variable'?project.variables[0]?.name||'':'');if(next.kind==='math')next=operand('math');safeSet(target,input.dataset.operandKind,next);}
  else {safeSet(target,path,next);if(path==='props.columns'&&target.props.columnLayout){const count=Number(next);while(target.children.length<count){const c=component('container',project);c.name='Colonne '+(target.children.length+1);c.style.padding=4;target.children.push(c);}}if(path==='props.variable'&&target.type==='products'){const fields=project.variables.find(v=>v.name===next)?.fields||[];target.props.nameField=fields.find(f=>f.type==='text')?.name||'name';target.props.priceField=fields.find(f=>f.type==='number')?.name||'price';target.props.imageField=fields.find(f=>f.type==='image')?.name||'image';}if(path==='props.variable'&&target.type==='list'){const f=project.variables.find(v=>v.name===next)?.fields?.find(f=>f.type==='text');target.props.itemText=f?'{{item.'+f.name+'}}':'{{item}}';}}
 },{redraw:redraw||!!input.dataset.operandKind,key:(selectedVariable||selectedId)+'.'+path});
}
document.addEventListener('input',event=>{
 const el=event.target;if(el.matches('select'))return;
 if(el.dataset.navigationProp){commit(()=>setNavigation(project,{[el.dataset.navigationProp]:el.checked}));return;}
 if(el.dataset.navigationItem){commit(()=>{const nav=navigationSettings(project);setNavigation(project,{items:el.checked?[...nav.items,el.dataset.navigationItem]:nav.items.filter(id=>id!==el.dataset.navigationItem)});});return;}
 if(el.dataset.path)mutateProperty(el);
 if(el.dataset.columnLabel!==undefined&&selectedVariable)commit(()=>selected().fields[Number(el.dataset.columnLabel)].label=el.value,{redraw:false,key:'column-label-'+el.dataset.columnLabel});
 if(el.id==='project-name')commit(()=>project.name=el.value,{redraw:false,key:'project-name'});
 if(el.dataset.screenProp)commit(()=>currentScreen()[el.dataset.screenProp]=el.value,{redraw:false,key:screenId+'.'+el.dataset.screenProp});
 if(el.dataset.themeProp)commit(()=>project.theme[el.dataset.themeProp]=el.type==='number'?Math.min(Number(el.max||60),Math.max(Number(el.min||0),Number(el.value))):el.value,{redraw:false,key:'theme.'+el.dataset.themeProp});
 if(el.dataset.recordField!==undefined)updateRecord(el);
});
function updateRecord(el){const v=selected();if(!v||v.type!=='list')return;const index=Number(el.dataset.recordField);const val=el.type==='number'?Number(el.value):el.dataset.recordType==='boolean'?el.value==='true':el.value;commit(()=>{if(el.dataset.recordKey){if(!v.initial[index]||typeof v.initial[index]!=='object')v.initial[index]={};v.initial[index][el.dataset.recordKey]=val;}else v.initial[index]=val;},{redraw:false,key:v.name+'.'+index+'.'+(el.dataset.recordKey||'')});}
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.dataset.buttonNavigation!==undefined){const n=selected();if(!n)return;commit(()=>{n.events.click=n.events.click.filter(a=>!['navigate','back'].includes(a.type));if(el.value==='back')n.events.click.push({type:'back'});else if(project.screens.some(s=>s.id===el.value))n.events.click.push({type:'navigate',screen:el.value});});return;}
 if(el.tagName==='SELECT'&&el.dataset.screenProp){commit(()=>currentScreen()[el.dataset.screenProp]=el.value,{redraw:false});return;}
 if(el.tagName==='SELECT'&&el.dataset.navigationProp){commit(()=>setNavigation(project,{[el.dataset.navigationProp]:el.value}));return;}
 if(el.tagName==='SELECT'&&el.dataset.path)mutateProperty(el,true);
 if(el.tagName==='SELECT'&&el.dataset.recordField!==undefined)updateRecord(el);
 if(el.dataset.insertAction&&el.value)insertAction(el.value,el.dataset.insertAction);
 if(el.dataset.insertBinding&&el.value){const n=selected();commit(()=>safeSet(n,el.dataset.insertBinding,(safeGet(n,el.dataset.insertBinding)||'')+'{{'+el.value+'}}'));}
 if(el.id==='event-picker'){eventName=el.value;renderInspector();}
});
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.tab){libraryTab=b.dataset.tab;renderLibrary();return;}
 if(b.dataset.screenModel){commit(()=>{screenId=addScreenTemplate(project,b.dataset.screenModel).id;selectedId=selectedVariable=null;mode='design';});return;}
 if(b.dataset.addColumns){addNode('container',Number(b.dataset.addColumns));return;}
 if(b.dataset.addComponent){addNode(b.dataset.addComponent);return;}
 if(b.dataset.selectNode){selectNode(b.dataset.selectNode);return;}
 if(b.hasAttribute('data-add-screen')){addScreen();return;}
 if(b.dataset.openScreen||b.dataset.screenSettings){screenId=b.dataset.openScreen||b.dataset.screenSettings;selectedId=selectedVariable=null;renderAll();return;}
 if(b.dataset.selectVariable){selectedVariable=b.dataset.selectVariable;selectedId=null;inspectorTab='props';renderInspector();renderLibrary();return;}
 if(b.hasAttribute('data-create-variable')){const name=$('#variable-name').value,type=$('#variable-type').value;if(!name.trim())return;commit(()=>{const v=variable(project,name,type,type==='number'?0:type==='boolean'?false:type==='list'?[]:'');v.label=name;if(type==='computed')v.formula=operand('literal',0);selectedVariable=v.name;selectedId=null;});return;}
 if(b.dataset.quickVariable){const label=prompt('Nom de la nouvelle donnée (ex. score, prénom, tâches)');if(!label?.trim())return;commit(()=>{const type=b.dataset.quickType,v=variable(project,label,type,type==='number'?0:type==='list'?[]:'');v.label=label;safeSet(selected(),b.dataset.quickVariable,v.name);});return;}
 if(b.dataset.nodeOp){const info=findNode(project,selectedId);if(!info)return;commit(()=>{const index=info.siblings.findIndex(n=>n.id===selectedId),op=b.dataset.nodeOp;if(op==='delete'){info.siblings.splice(index,1);selectedId=null;}if(op==='duplicate'){const copy=duplicateNode(info.node);info.siblings.splice(index+1,0,copy);selectedId=copy.id;}if(op==='up'&&index>0)[info.siblings[index-1],info.siblings[index]]=[info.siblings[index],info.siblings[index-1]];if(op==='down'&&index<info.siblings.length-1)[info.siblings[index+1],info.siblings[index]]=[info.siblings[index],info.siblings[index+1]];});return;}
 if(b.dataset.pickImage){commit(()=>selected().props.src=b.dataset.pickImage);return;}
 if(b.hasAttribute('data-upload-image')){uploadTarget={node:selectedId};$('#image-upload').click();return;}
 if(b.dataset.uploadRecord!==undefined){uploadTarget={variable:selectedVariable,index:Number(b.dataset.uploadRecord),key:b.dataset.recordKey};$('#image-upload').click();return;}
 if(b.dataset.addAction){insertAction(b.dataset.addAction);return;}
 if(b.dataset.deleteAction||b.dataset.moveAction){const path=b.dataset.deleteAction||b.dataset.moveAction,parts=path.split('.'),index=Number(parts.pop()),n=selected();commit(()=>{const list=safeGet(n,parts.join('.'));if(b.dataset.deleteAction)list.splice(index,1);else{const to=index+Number(b.dataset.delta);[list[index],list[to]]=[list[to],list[index]];}});return;}
 if(b.dataset.addCondition){commit(()=>safeGet(selected(),b.dataset.addCondition).conditions.push({left:operand('literal',''),op:'eq',right:operand('literal','')}));return;}
 if(b.dataset.deleteCondition){const parts=b.dataset.deleteCondition.split('.'),index=Number(parts.pop());commit(()=>safeGet(selected(),parts.join('.')).splice(index,1));return;}
 if(b.hasAttribute('data-set-home')){commit(()=>project.home=screenId);return;}
 if(b.hasAttribute('data-duplicate-screen')){commit(()=>{const s=structuredClone(currentScreen());s.id=uid('screen');s.name+=' copie';s.nodes=s.nodes.map(duplicateNode);project.screens.push(s);screenId=s.id;});return;}
 if(b.hasAttribute('data-delete-screen')){if(project.screens.length<2||!confirm('Supprimer cet écran et ses composants ?'))return;commit(()=>{project.screens=project.screens.filter(s=>s.id!==screenId);if(project.home===screenId)project.home=project.screens[0].id;screenId=project.screens[0].id;selectedId=null;});return;}
 if(b.hasAttribute('data-add-record')){commit(()=>{const v=selected(),fields=v.fields||[];v.initial.push(fields.length?Object.fromEntries(fields.map(f=>[f.name,f.type==='number'?0:f.type==='boolean'?false:''])):'Nouvel élément');});return;}
 if(b.dataset.deleteRecord!==undefined){commit(()=>selected().initial.splice(Number(b.dataset.deleteRecord),1));return;}
 if(b.hasAttribute('data-add-column')){const label=$('#new-column-name').value.trim(),name=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_]+/g,'_'),type=$('#new-column-type').value;if(!/^[a-zA-Z_]\w*$/.test(name)||['__proto__','constructor','prototype'].includes(name)){ $('#canvas-status').textContent='Donne un nom à ce champ.';return;}if(selected().fields.some(f=>f.name===name))return;commit(()=>{const v=selected();v.fields.push({name,label,type});v.initial=v.initial.map(item=>({...typeof item==='object'&&item!==null?item:{},[name]:type==='number'?0:type==='boolean'?false:''}));});return;}
 if(b.dataset.deleteColumn!==undefined){commit(()=>{const v=selected(),[f]=v.fields.splice(Number(b.dataset.deleteColumn),1);for(const row of v.initial)if(row&&typeof row==='object')delete row[f.name];});return;}
 if(b.hasAttribute('data-delete-variable')){if(!confirm('Supprimer cette variable ? Les composants liés devront être reconfigurés.'))return;commit(()=>{project.variables=project.variables.filter(v=>v.name!==selectedVariable);selectedVariable=null;});return;}
 if(b.hasAttribute('data-rename-variable')){const previous=selectedVariable,next=prompt('Nouvel identifiant de la variable',previous);if(!next||!/^\w+$/.test(next)||['__proto__','constructor','prototype'].includes(next)||project.variables.some(v=>v.name===next))return;commit(()=>{const visit=obj=>{if(!obj||typeof obj!=='object')return;for(const [k,v]of Object.entries(obj)){if(typeof v==='string'){if(['variable','discountVariable','visibleVariable','textVariable'].includes(k)&&v===previous||['variable','length','cartTotal'].includes(obj.kind)&&k==='name'&&v===previous)obj[k]=next;else obj[k]=v.replaceAll('{{'+previous+'}}','{{'+next+'}}').replaceAll('{{'+previous+'.','{{'+next+'.');}else visit(v);}};selected().name=next;visit(project);selectedVariable=next;});return;}
 if(b.dataset.template){if((project.screens.some(s=>s.nodes.length)||project.variables.length)&&!confirm('Remplacer le projet ouvert ? Télécharge son JSON pour le conserver.'))return;history=[];future=[];project=b.dataset.template==='restaurant'?restaurantTemplate():b.dataset.template==='tasks'?tasksTemplate():blankProject();screenId=project.home;selectedId=selectedVariable=null;mode='design';libraryTab='components';save();$('#new-dialog').close();renderAll();return;}
 if(b.dataset.close)$('#'+b.dataset.close).close();
});
$('#image-upload').onchange=async event=>{const file=event.target.files[0];if(!file||!uploadTarget)return;try{if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choisis une image PNG, JPEG, WebP ou GIF.');if(file.size>10*1024*1024)throw Error('Choisis une image de moins de 10 Mo.');const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});commit(()=>{if(uploadTarget.node){const n=findNode(project,uploadTarget.node)?.node;if(n)n.props.src=src;}else{const v=project.variables.find(v=>v.name===uploadTarget.variable);if(v&&uploadTarget.index<v.initial.length){if(!v.initial[uploadTarget.index]||typeof v.initial[uploadTarget.index]!=='object')v.initial[uploadTarget.index]={};v.initial[uploadTarget.index][uploadTarget.key]=src;}}});}catch(error){$('#save-status').textContent=error.message;}finally{event.target.value='';uploadTarget=null;}};
document.addEventListener('dragstart',event=>{
 const c=event.target.closest('[data-add-component],[data-add-action],[data-add-columns],[data-move-node]');if(!c)return;
 if(c.dataset.moveNode&&mode!=='design')return;
 dragItem=c.dataset.addColumns?{columns:Number(c.dataset.addColumns)}:c.dataset.moveNode?{move:c.dataset.moveNode}:c.dataset.addComponent?{component:c.dataset.addComponent}:{action:c.dataset.addAction};
 event.dataTransfer.setData('text/plain',JSON.stringify(dragItem));event.dataTransfer.effectAllowed=dragItem.move?'move':'copy';
});
document.addEventListener('dragover',event=>{const drop=event.target.closest('[data-player-drop],[data-action-target]');if(!drop||!dragItem)return;if((dragItem.component||dragItem.columns||dragItem.move)&&drop.dataset.playerDrop!==undefined&&mode==='design'||dragItem.action&&drop.dataset.actionTarget){event.preventDefault();drop.classList.add('drop-destination');}});
document.addEventListener('dragleave',event=>event.target.closest('.drop-destination')?.classList.remove('drop-destination'));
document.addEventListener('dragend',()=>{dragItem=null;document.querySelectorAll('.drop-destination').forEach(el=>el.classList.remove('drop-destination'));});
document.addEventListener('drop',event=>{
 const drop=event.target.closest('[data-player-drop],[data-action-target]');if(!drop||!dragItem)return;event.preventDefault();drop.classList.remove('drop-destination');
 if(mode==='design'&&drop.dataset.playerDrop!==undefined){const parentId=drop.dataset.playerDrop;
  if(dragItem.move){const id=dragItem.move;commit(()=>{if(moveNode(project,id,parentId,screenId)){selectedId=id;selectedVariable=null;inspectorTab='props';}});}
  else if(dragItem.component||dragItem.columns){selectedId=parentId==='root'?null:parentId;addNode(dragItem.component||'container',dragItem.columns||0);}
 }else if(dragItem.action&&drop.dataset.actionTarget)insertAction(dragItem.action,drop.dataset.actionTarget);
 dragItem=null;
});
$('#props-tab').onclick=()=>{inspectorTab='props';renderInspector();};$('#events-tab').onclick=()=>{inspectorTab='actions';eventName=['list','products'].includes(selected()?.type)?'item':['input','number','textarea','select','toggle'].includes(selected()?.type)?'change':'click';renderInspector();};
$('#deselect').onclick=()=>{selectedId=selectedVariable=null;renderInspector();player.select('');};
$('#screen-picker').onchange=event=>{screenId=event.target.value;selectedId=selectedVariable=null;renderAll();};$('#add-screen').onclick=addScreen;
$('#design-mode').onclick=()=>{mode='design';if(findNode(project,selectedId)?.screen.id!==screenId)selectedId=null;renderAll();};$('#test-mode').onclick=()=>{mode='test';refreshPlayer();};$('#reset-test').onclick=()=>{player.reset();screenId=project.home;renderScreensPicker();};
$('#undo').onclick=()=>{if(!history.length)return;lastEdit='';future.push(JSON.stringify(project));project=JSON.parse(history.pop());if(!project.screens.some(s=>s.id===screenId))screenId=project.home;if(!findNode(project,selectedId))selectedId=null;if(!project.variables.some(v=>v.name===selectedVariable))selectedVariable=null;save();renderAll();};
$('#redo').onclick=()=>{if(!future.length)return;lastEdit='';history.push(JSON.stringify(project));project=JSON.parse(future.pop());if(!project.screens.some(s=>s.id===screenId))screenId=project.home;save();renderAll();};
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();(event.shiftKey?$('#redo'):$('#undo')).click();}});
$('#new-project').onclick=()=>$('#new-dialog').showModal();
function showState(title,data){$('#state-title').textContent=title;$('#state-content').textContent=JSON.stringify(data,(_,value)=>typeof value==='string'&&value.startsWith('data:image/')?'[Image importée]':value,2);$('#state-dialog').showModal();}
$('#test-state').onclick=()=>showState('État du test',lastState);$('#issues-button').onclick=()=>showState('Liaisons à vérifier',issues());
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#backup').onclick=()=>download(JSON.stringify(project,null,2),'application/json',(project.name||'project')+'.json');$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>30*1024*1024)throw Error('Ce fichier est trop volumineux.');const next=JSON.parse(await file.text());if(!validateProject(next))throw Error('Choisis un projet JSON de cet éditeur.');if(!confirm('Remplacer le projet ouvert ?'))return;snapshot();project=next;screenId=project.home;selectedId=selectedVariable=null;mode='design';save();renderAll();}catch(error){$('#save-status').textContent=error instanceof SyntaxError?'Ce fichier ne contient pas un projet JSON valide.':error.message;}finally{event.target.value='';}};
$('#export-app').onclick=async()=>{const button=$('#export-app');button.disabled=true;try{const output=structuredClone(project),images=new Map();const collect=obj=>{if(!obj||typeof obj!=='object')return;for(const value of Object.values(obj))if(typeof value==='string'&&/^assets\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(value))images.set(value,null);else if(value&&typeof value==='object')collect(value);};collect(output);await Promise.all([...images.keys()].map(async url=>{const response=await fetch(url);if(!response.ok)throw Error('Image introuvable : '+url);const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;response.arrayBuffer().then(buffer=>r.readAsDataURL(new Blob([buffer],{type:url.endsWith('.png')?'image/png':url.endsWith('.webp')?'image/webp':'image/jpeg'}))).catch(reject);});images.set(url,data);}));const replace=obj=>{for(const [k,v]of Object.entries(obj))if(typeof v==='string'&&images.has(v))obj[k]=images.get(v);else if(v&&typeof v==='object')replace(v);};replace(output);const json=JSON.stringify(output).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'"><title>${esc(output.name)}</title><style>${playerCSS}body{margin:0;background:#eee4f3;display:grid;place-items:center;min-height:100vh}.app-player{width:min(100vw,420px);height:100dvh;max-height:1000px;box-shadow:0 0 30px #29173f20}</style></head><body><main id="application" class="app-player"></main><script>(${createPlayer.toString()})(document.querySelector('#application'),${json},{persist:true});</script></body></html>`;download(html,'text/html',(project.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-')||'application')+'.html');$('#save-status').textContent='Application HTML exportée, images incluses.';}catch(error){$('#save-status').textContent='Export : '+error.message;}finally{button.disabled=false;}};
player=createPlayer($('#player'),project,{design:true,onSelect:selectNode,onChange:detail=>{lastState=detail;if(mode==='test'&&detail.screen){const changed=screenId!==detail.screen;screenId=detail.screen;if(changed){selectedId=selectedVariable=null;renderScreensPicker();renderLibrary();renderInspector();}$('#screen-picker').value=screenId;$('#canvas-status').textContent='Test · '+currentScreen().name;}}});
$('#share-app').onclick=async()=>{
 $('#share-dialog').showModal();$('#share-status').textContent='Création du lien…';$('#share-qr').replaceChildren();$('#copy-share').disabled=true;$('#open-share').hidden=true;$('#share-link').value='';
 try{
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const base=local?'https://givros.github.io/3e-chams/':new URL('./',location.href).href;
  const url=new URL('view.html',base);url.hash=await encodeProject(project);
  if(url.href.length>60000)throw Error('Les images importées rendent le lien trop long. Réduis leur taille ou utilise l’export HTML.');
  $('#share-link').value=url.href;$('#copy-share').disabled=false;$('#open-share').href=url.href;$('#open-share').hidden=false;
  let qrReady=false;
  try{const qr=window.qrcode(0,'L');qr.addData(url.href);qr.make();$('#share-qr').innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});qrReady=true;}catch{}
  $('#share-status').textContent=(qrReady?'Scanne le QR code avec ton téléphone.':'Lien créé. Trop de contenu pour un QR code : copie le lien.')+(local?' La page GitHub doit avoir reçu cette mise à jour avant de pouvoir ouvrir le lien.':'');
 }catch(error){$('#share-status').textContent=error.message;}
};
$('#copy-share').onclick=async()=>{try{await navigator.clipboard.writeText($('#share-link').value);$('#share-status').textContent='Lien copié.';}catch{$('#share-link').select();$('#share-status').textContent='Sélectionne puis copie le lien.';}};
renderAll();save();if(loadMessage)$('#save-status').textContent=loadMessage;
