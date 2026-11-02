import {createAppTimers} from './studio-timers.js';
import {insertionIndex,moveActionBlock} from './studio-drag.js';
import {starterProject} from './studio-start.js';
import {installFlowUI} from './studio-flow-ui.js';
import {photoBank,photoCategories} from './studio-photos.js';
import {createLocalCamera} from './studio-camera.js';
import {iconChoices,renderAppIcon} from './studio-icons.js';
import {catalog,actionTypes,uid,blankProject,component,variable,walk,findNode,duplicateNode,duplicateScreen,operand,action,restaurantTemplate,tasksTemplate,validateProject} from './studio-model.js';
import {createPlayer,playerCSS} from './studio-player.js';
import {screenTemplates,addScreenTemplate,mobileAppTemplate} from './screen-templates.js';
import {encodeProject} from './share.js';
import {projectIssues} from './studio-diagnostics.js';
import {columnLayout,moveNode,containerTargets,decorativeLayout,insertNodeAt} from './studio-layout.js';
import {navigationSettings,setNavigation,cleanNavigation,moveNavigationItem} from './studio-navigation.js';
import {componentCategories,libraryEntries,normalizeSearch} from './studio-library.js';
import {activeProjectKey,listProjects,archiveProject,switchProject,removeProject,loadActiveProject,listRecoveries,recoveryPrefix,importedProjectCopy,projectLibraryStatus,repairProjectLibrary} from './studio-projects.js';
import {themePresets,appFonts,applyThemePreset,setAppBackground,readableText} from './studio-theme.js';
import {createProductDetails} from './studio-detail.js';
import {describeTestState} from './studio-inspection.js';
import {syncDataLabels,addListField,changeListFieldType,connectListFields} from './studio-data.js';
import {prepareImage} from './studio-images.js';
import {expectedValueType,conditionValueType,normalizeActionInputs} from './studio-actions.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let photoCategory='all',photoQuery='';
const typeLabels={text:'Texte',number:'Nombre',boolean:'Oui / non',list:'Liste',computed:'Calcul'};
const storageKey=activeProjectKey;let project=blankProject(),loadMessage='',componentQuery='',componentCategory='all',modelQuery='',librarySaveTimer,imageJob=0,libraryCopyDownloaded=false;
let recovery=null;
try{const loaded=loadActiveProject(localStorage);project=loaded.project;recovery=loaded.recovery||null;if(recovery)loadMessage='Une ancienne sauvegarde a été conservée pour récupération.';}catch{loadMessage='Enregistrement local indisponible.';}

try{if(!localStorage.getItem(storageKey)&&!localStorage.getItem('juvign-miam-starter-complete')&&!recovery)project=starterProject();}catch{}
let flowUI;
walk(project,n=>{const match=String(n.props.text||'').match(/^(.*?)\{\{(\w+)\}\}$/);if(match&&!n.props.textVariable&&project.variables.some(v=>v.name===match[2])){n.props.text=match[1];n.props.textVariable=match[2];}});
for(const v of project.variables)for(const f of v.fields||[])if(f.type==='text'&&v.initial?.some(item=>typeof item?.[f.name]==='string'&&/^(assets\/|data:image\/)/.test(item[f.name])))f.type='image';
let screenId=project.home,selectedId=null,selectedVariable=null,libraryTab='components',inspectorTab='props',eventName='click',mode='design',actionPath=null,history=[],future=[],lastEdit='',lastEditTime=0,dragItem=null,uploadTarget=null,player,lastState={};
const style=document.createElement('style');style.textContent=playerCSS;document.head.append(style);
function save(){
 syncDataLabels(project);
 clearTimeout(librarySaveTimer);
 if(recovery?.blocked){$('#save-status').textContent='Récupère l’ancienne sauvegarde avant d’enregistrer.';}else try{localStorage.setItem(storageKey,JSON.stringify(project));$('#save-status').textContent='Enregistré sur cet ordinateur';librarySaveTimer=setTimeout(()=>{try{archiveProject(localStorage,project);}catch{$('#save-status').textContent='Bibliothèque indisponible : télécharge une sauvegarde du projet.';}},650);}catch{$('#save-status').textContent='Stockage plein : télécharge le projet JSON.';}
 $('#undo').disabled=!history.length;$('#redo').disabled=!future.length;
}
function projectError(error){
 const message=error?.name==='QuotaExceededError'?'Espace insuffisant. Télécharge une sauvegarde avant de changer d’application.':error.message;
 $('#save-status').textContent=message;
 for(const id of ['projects','new-project']){const target=$('#'+id+'-error');if(target){target.hidden=false;target.textContent=message;}}
}
function activateProject(next,{undoable=false}={}){
 if(recovery?.blocked){for(const id of ['new-dialog','projects-dialog'])$('#'+id).close();projectError(Error('Télécharge d’abord l’ancienne sauvegarde avec le bouton de récupération.'));return false;}
 try{clearTimeout(librarySaveTimer);switchProject(localStorage,project,next);if(undoable)snapshot();else{history=[];future=[];lastEdit='';lastEditTime=0;}project=next;screenId=project.home;selectedId=selectedVariable=null;mode='design';libraryTab='components';componentQuery=modelQuery='';componentCategory='all';save();renderAll();return true;}catch(error){projectError(error);return false;}
}
function renderProjectLibrary(){
 let records=listProjects(localStorage);if(!records.some(r=>r.project.id===project.id))records.unshift({project,updatedAt:new Date().toISOString()});
 const query=normalizeSearch($('#project-library-search').value);
 records=records.filter(r=>!query||normalizeSearch(r.project.name).includes(query)).sort((a,b)=>(b.project.id===project.id)-(a.project.id===project.id)||b.updatedAt.localeCompare(a.updatedAt));
 $('#project-list').innerHTML=records.length?records.map(r=>{const p=r.project,active=p.id===project.id;return `<div class="project-row"><div><input data-project-name="${p.id}" aria-label="Nom de l’application ${esc(p.name)}" value="${esc(active?project.name:p.name)}"><small>${p.screens.length} écran${p.screens.length>1?'s':''} · ${new Date(r.updatedAt).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div><button class="project-open" data-project-open="${p.id}" ${active?'disabled':''}>${active?'Ouverte':'Ouvrir'}</button><button data-project-copy="${p.id}">Dupliquer</button><button class="danger" data-project-delete="${p.id}" ${active?'disabled':''}>Supprimer</button></div>`;}).join(''):'<p class="help">Aucune application trouvée.</p>';
 const copies=listRecoveries(localStorage);if(copies.length)$('#project-list').insertAdjacentHTML('beforeend',`<details class="advanced"><summary>Copies à récupérer (${copies.length})</summary>${copies.map(copy=>`<div class="project-recovery-row"><span>${esc(copy.name)}</span><button data-recover-copy="${esc(copy.key)}">Télécharger</button><button class="danger" data-delete-recovery="${esc(copy.key)}">Supprimer</button></div>`).join('')}</details>`);

 const status=projectLibraryStatus(localStorage);if(!status.readable&&status.raw)$('#project-list').insertAdjacentHTML('beforeend','<section class="project-error"><p>La bibliothèque est illisible. L’application ouverte reste utilisable.</p><button data-download-library>Récupérer une copie</button><button data-repair-library>Recréer la bibliothèque</button></section>');

}
function editorSnapshot(){return {project:JSON.stringify(project),screenId,selectedId,selectedVariable,inspectorTab,eventName,libraryTab};}
function restoreEditor(snapshot){const completedId=project.starter?.complete?project.id:null;project=JSON.parse(snapshot.project);if(project.id===completedId&&project.starter)project.starter.complete=true;screenId=project.screens.some(s=>s.id===snapshot.screenId)?snapshot.screenId:project.home;selectedId=findNode(project,snapshot.selectedId)?snapshot.selectedId:null;selectedVariable=project.variables.some(v=>v.name===snapshot.selectedVariable)?snapshot.selectedVariable:null;inspectorTab=snapshot.inspectorTab;eventName=snapshot.eventName;libraryTab=snapshot.libraryTab;save();renderAll();}
function snapshot(key='',saved){const now=Date.now();if(!key||key!==lastEdit||now-lastEditTime>900){history.push(saved||editorSnapshot());if(history.length>30)history.shift();}lastEdit=key;lastEditTime=now;future=[];}
function commit(mutator,{redraw=true,key=''}={}){
 const before=editorSnapshot(),oldHistory=history.slice(),oldFuture=future.slice(),oldEdit=lastEdit,oldTime=lastEditTime;
 snapshot(key,before);const screens=new Set(project.screens.map(s=>s.id));
 try{mutator();if(project.navigation?.enabled)for(const s of project.screens)if(!screens.has(s.id)&&!s.menuHidden)project.navigation.items.push(s.id);cleanNavigation(project);}
 catch(error){history=oldHistory;future=oldFuture;lastEdit=oldEdit;lastEditTime=oldTime;restoreEditor(before);throw error;}
 save();if(redraw)renderAll();else{renderScreensPicker();renderLibrary();refreshPlayer();renderIssues();}
}
function safeGet(object,path){return path.split('.').reduce((value,key)=>['__proto__','constructor','prototype'].includes(key)?undefined:value?.[key],object);}
function safeSet(object,path,value){const keys=path.split('.');if(keys.some(k=>['__proto__','constructor','prototype'].includes(k)))return;for(const key of keys.slice(0,-1)){if(object[key]===undefined)object[key]={};object=object[key];}object[keys.at(-1)]=value;}
function selected(){return selectedVariable?project.variables.find(v=>v.name===selectedVariable):findNode(project,selectedId)?.node;}
function currentScreen(){return project.screens.find(s=>s.id===screenId)||project.screens[0];}
function option(value,label,current){return `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;}
function selectInput(path,value,items,extra=''){return `<select class="full" data-path="${path}" ${extra}>${items.map(item=>option(Array.isArray(item)?item[0]:item,Array.isArray(item)?item[1]:item,value)).join('')}</select>`;}
function input(path,value,type='text',extra=''){return `<input class="full" type="${type}" data-path="${path}" value="${esc(value)}" ${extra}>`;}
function field(label,content){return `<label class="field-label">${label}</label>${content}`;}
function variablesOptions(type=null){return [['','— Choisir —'],...project.variables.filter(v=>!type||v.type===type).map(v=>[v.name,v.label||v.name])];}
function writableOptions(type=null){return variablesOptions(type).filter(([name])=>!name||project.variables.find(v=>v.name===name)?.type!=='computed');}
function addNode(type,columns=0,layout='',placement=null,initialProps=null){if(!columns&&!catalog.some(c=>c.type===type))return;commit(()=>{const info=findNode(project,selectedId),parent=['container','form','accordion'].includes(info?.node.type)?info.node:['container','form','accordion'].includes(info?.parent?.type)?info.parent:null,node=layout?decorativeLayout(project,layout):columns?columnLayout(project,columns):component(type,project);const siblings=parent?parent.children:currentScreen().nodes;if(initialProps)Object.assign(node.props,initialProps);if(placement){if(!insertNodeAt(project,node,placement.parent,screenId,placement.index))throw Error('Choisis une zone de dépôt valide.');}else if(info&&!['container','form','accordion'].includes(info.node.type)&&siblings===info.siblings)siblings.splice(siblings.indexOf(info.node)+1,0,node);else siblings.push(node);if(type==='search'){let target;walk(project,(n,s)=>{if(!target&&s.id===screenId&&['list','products','productDetail'].includes(n.type)&&!n.props.searchVariable)target=n;});if(target)target.props.searchVariable=node.props.variable;}if(['list','products','productDetail'].includes(type)){let search;walk(project,(n,s)=>{if(!search&&s.id===screenId&&n.type==='search')search=n;});if(search)node.props.searchVariable=search.props.variable;}selectedId=node.id;selectedVariable=null;inspectorTab='props';eventName=node.type==='timer'?'finish':['list','products','productDetail'].includes(node.type)?'item':['input','number','textarea','select','toggle','search','date','range','rating','camera'].includes(node.type)?'change':'click';});}
function selectNode(id){selectedId=id;selectedVariable=null;inspectorTab='props';const found=findNode(project,id);if(found){screenId=found.screen.id;eventName=found.node.type==='timer'?'finish':['list','products','productDetail'].includes(found.node.type)?'item':['input','number','textarea','select','toggle','search','date','range','rating','camera'].includes(found.node.type)?'change':'click';}renderInspector();renderLibrary();player?.select(id);}
function renderScreensPicker(){$('#project-name').value=project.name;$('#screen-picker').innerHTML=project.screens.map(s=>option(s.id,s.name,screenId)).join('');}
function treeHTML(nodes,depth=0){return nodes.map(n=>`<button class="tree-row ${n.id===selectedId?'active':''}" draggable="true" data-move-node="${n.id}" ${['container','form','accordion'].includes(n.type)?`data-player-drop="${n.id}"`:''} data-select-node="${n.id}" style="padding-left:${8+depth*13}px">${esc(n.name)}<small>${catalog.find(c=>c.type===n.type)?.label||''}</small></button>${treeHTML(n.children||[],depth+1)}`).join('');}
function renderLibrary(){
 const focusId=['component-search','model-search'].includes(document.activeElement?.id)?document.activeElement.id:null,caret=focusId?document.activeElement.selectionStart:0;
 for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===libraryTab);
 let html='';
 if(libraryTab==='models')html=`<input class="library-search" id="model-search" type="search" placeholder="Rechercher un mod&#232;le" aria-label="Rechercher un mod&#232;le" value="${esc(modelQuery)}"><div class="section-label">Ajouter un écran · ${screenTemplates.length} modèles</div><p class="help">Glisse un modèle dans le téléphone pour créer un nouvel écran.</p><div class="screen-model-list">${screenTemplates.filter(t=>!modelQuery||normalizeSearch(t.name+' '+t.description).includes(normalizeSearch(modelQuery))).map(t=>`<button draggable="true" data-screen-model="${t.id}">${t.image?`<img src="assets/${t.image}.jpg" alt="" draggable="false">`:`<b class="model-icon" style="background:${t.color}">${esc(t.icon)}</b>`}<strong>${esc(t.name)}</strong><span>${esc(t.description)}</span></button>`).join('')}</div>`;
 if(libraryTab==='components'){
  const entries=libraryEntries(componentQuery,componentCategory);
  html=`<input class="library-search" id="component-search" type="search" placeholder="Rechercher un élément" aria-label="Rechercher un élément" value="${esc(componentQuery)}"><select class="library-filter" id="component-category" aria-label="Famille de composants">${componentCategories.map(([v,l])=>option(v,l,componentCategory)).join('')}</select>`;
  html+=entries.length?componentCategories.filter(([id])=>id!=='all').map(([id,label])=>{const items=entries.filter(e=>e.category===id);return items.length?`<div class="section-label">${esc(label)}</div><div class="component-grid">${items.map(c=>`<button class="component-button" draggable="true" ${c.attribute}><span>${esc(c.icon)}</span><b>${esc(c.label)}</b></button>`).join('')}</div>`:'';}).join(''):'<p class="help">Aucun élément trouvé.</p>';
  html+=`<p class="library-drag-hint">Glisse un élément dans ton écran ou dans un groupe.</p><div class="section-label library-structure-title">Structure de l’écran</div><div class="tree">${treeHTML(currentScreen().nodes)}</div>`;
 }
 if(libraryTab==='screens')html=`<div class="section-label">Écrans</div>${project.screens.map(s=>`<div class="screen-row ${s.id===screenId?'active':''}"><button data-open-screen="${s.id}">${s.id===project.home?'⌂ ':''}${esc(s.name)}</button><button data-screen-settings="${s.id}" aria-label="Réglages de ${esc(s.name)}">⚙</button></div>`).join('')}<button class="outline-button" data-add-screen>＋ Ajouter un écran</button><div class="section-label" style="margin-top:25px">Structure</div>${treeHTML(currentScreen().nodes)}`;
 if(libraryTab==='data')html=`<div class="section-label">Variables de l’application</div>${project.variables.map(v=>`<button class="data-row" data-select-variable="${v.name}"><strong>${esc(v.label||v.name)}</strong><span class="type-chip">${esc(typeLabels[v.type])}</span></button>`).join('')}<div class="data-create"><label class="field-label">Nouvelle variable</label><input id="variable-name" placeholder="Ex. score, nom, produits"><select id="variable-type">${[['text','Texte'],['number','Nombre'],['boolean','Oui / non'],['list','Liste'],['computed','Calcul']].map(([v,l])=>option(v,l,'text')).join('')}</select><button class="solid-button" data-create-variable>Créer</button></div>`;
 if(libraryTab==='actions')html=`<div class="section-label">Blocs d’action</div><div class="action-palette">${actionTypes.map(([type,label])=>`<button class="${type==='if'?'if-block':''}" draggable="true" data-add-action="${type}">${type==='if'?'◇':'↳'} ${label}</button>`).join('')}</div><p class="help">Sélectionne un composant, puis glisse les actions à l’endroit voulu dans son événement.</p>`;
 if(libraryTab==='screens'){
  const nav=navigationSettings(project);
  html+=`<section class="navigation-config"><div class="section-label">Menu de l’application</div><label class="toggle-row">Afficher un menu<input type="checkbox" data-navigation-prop="enabled" ${nav.enabled?'checked':''}></label>${nav.enabled?`<label class="field-label">Présentation</label><select class="full" data-navigation-prop="style">${option('tabs','Onglets en bas',nav.style)}${option('drawer','Icône en haut',nav.style)}${option('both','Icône en haut + onglets en bas',nav.style)}</select><label class="field-label">Icône en haut à droite</label><select class="full" data-navigation-prop="headerIcon">${option('none','Aucune',nav.headerIcon)}${option('menu','Menu ☰',nav.headerIcon)}${option('profile','Profil',nav.headerIcon)}${option('settings','Paramètres ⚙',nav.headerIcon)}</select>${nav.headerIcon==='profile'?`<label class="field-label">Écran du profil</label><select class="full" data-navigation-prop="profileScreen">${option('','Choisir un écran',nav.profileScreen)}${project.screens.map(s=>option(s.id,s.name,nav.profileScreen)).join('')}</select>`:''}${nav.headerIcon==='settings'?`<label class="field-label">Écran des paramètres</label><select class="full" data-navigation-prop="settingsScreen">${option('','Choisir un écran',nav.settingsScreen)}${project.screens.map(s=>option(s.id,s.name,nav.settingsScreen)).join('')}</select><button class="outline-button" data-create-settings>＋ Ajouter un écran Paramètres</button>`:''}<label class="toggle-row">Barre de titre<input type="checkbox" data-navigation-prop="showHeader" ${nav.showHeader?'checked':''}></label><label class="toggle-row">Flèche de retour<input type="checkbox" data-navigation-prop="showBack" ${nav.showBack?'checked':''}></label><label class="field-label">Écrans dans le menu</label>${[...nav.items.map(id=>project.screens.find(s=>s.id===id)).filter(Boolean),...project.screens.filter(s=>!nav.items.includes(s.id))].map(s=>{const index=nav.items.indexOf(s.id);return `<div class="nav-screen-row"><label class="nav-screen-choice"><input type="checkbox" data-navigation-item="${s.id}" ${index>=0?'checked':''}><span>${esc(s.menuLabel||s.name)}</span></label>${index>=0?`<button data-order-navigation="${s.id}" data-delta="-1" aria-label="Monter ${esc(s.menuLabel||s.name)} dans le menu" ${index===0?'disabled':''}>↑</button><button data-order-navigation="${s.id}" data-delta="1" aria-label="Descendre ${esc(s.menuLabel||s.name)} dans le menu" ${index===nav.items.length-1?'disabled':''}>↓</button>`:''}</div>`;}).join('')}`:''}</section>`;
 }
 $('#library-content').innerHTML=html;if(focusId){const el=document.getElementById(focusId);if(el){el.focus();try{el.setSelectionRange(caret,caret);}catch{}}}
}
function operandUI(path,v={kind:'literal',value:''},depth=0,expectedType){
 let body=selectInput(path+'.kind',v.kind||'literal',[['literal','Une valeur que je choisis'],['variable','Une donnée de mon appli'],['input','Ce qui vient d’être saisi'],['item','L’élément cliqué'],['cartTotal','Le total d’un panier'],['length','Le nombre d’éléments'],['math','Un calcul']],`data-operand-kind="${path}"`);
 if(v.kind==='variable'||v.kind==='cartTotal'||v.kind==='length')body+=selectInput(path+'.name',v.name,variablesOptions(v.kind==='variable'?null:'list'));
 else if(v.kind==='item'){const fields=project.variables.find(v=>v.name===selected()?.props?.variable)?.fields||[],choices=[['','L’élément entier'],...fields.map(f=>[f.name,f.label||f.name])];if(v.field&&!choices.some(([id])=>id===v.field))choices.push([v.field,v.field]);body+=selectInput(path+'.field',v.field||'',choices)+`<details class="advanced"><summary>Champ personnalisé</summary>${input(path+'.field',v.field||'')}</details>`;}
 else if(v.kind==='math'&&depth<8)body+=operandUI(path+'.a',v.a,depth+1,'number')+selectInput(path+'.op',v.op,[['add','＋'],['subtract','−'],['multiply','×'],['divide','÷']])+operandUI(path+'.b',v.b,depth+1,'number');
 else if(v.kind==='literal'||!v.kind){const type=expectedType||(typeof v.value==='boolean'?'boolean':typeof v.value==='number'?'number':Array.isArray(v.value)?'list':'text');if(type==='boolean'){const normalized=typeof v.value==='boolean'?String(v.value):['oui','vrai','true','1'].includes(String(v.value).toLowerCase())?'true':['non','faux','false','0',''].includes(String(v.value).toLowerCase())?'false':'';body+=selectInput(path+'.value',normalized,[['','Choisir Oui ou Non'],['true','Oui'],['false','Non']],'data-boolean="true"');}else if(type==='list')body+=`<p class="help">${Array.isArray(v.value)&&v.value.length?v.value.length+' éléments définis.':'Liste vide.'} Choisis une donnée pour utiliser une liste déjà remplie.</p>${Array.isArray(v.value)&&v.value.length?`<button data-empty-list="${path}.value" class="outline-button">Vider cette liste</button>`:''}`;else body+=input(path+'.value',v.value??'',type==='number'?'number':type==='date'?'date':'text',type==='number'?'step="any"':'placeholder="Valeur"');}
 return `<div class="operand">${body}</div>`;
}
function actionsUI(list,path,depth=0){
 if(depth>15)return '<p class="help">Ouvre un bloc moins imbriqué pour le modifier.</p>';
 const cards=(list||[]).map((a,i)=>{const base=path+'.'+i;let fields='';
 if(['set','increment','append','remove','cartAdd'].includes(a.type))fields+=field(a.type==='append'||a.type==='remove'||a.type==='cartAdd'?'Liste à modifier':'Donnée à modifier',selectInput(base+'.variable',a.variable,writableOptions(a.type==='increment'?'number':['append','remove','cartAdd'].includes(a.type)?'list':null)));
 if(['set','increment','append','remove','cartAdd'].includes(a.type))fields+=`<button class="action-insert" data-quick-variable="${base}.variable" data-quick-type="${a.type==='increment'?'number':['append','remove','cartAdd'].includes(a.type)?'list':'text'}">＋ Créer une donnée</button>`;
 if(a.type==='set'||a.type==='append'||a.type==='toast')fields+=field(a.type==='toast'?'Message':'Valeur',operandUI(base+'.value',a.value,0,a.type==='set'?expectedValueType(project,a.variable):undefined));
 if(a.type==='increment')fields+=field('Ajouter (nombre négatif pour retirer)',input(base+'.delta',a.delta??1,'number','step="any"'));
 if(a.type==='cartAdd')fields+=field('Quantité',input(base+'.quantity',a.quantity||1,'number','min="1"'));
 if(a.type==='remove')fields+='<p class="help">Retire l’élément cliqué dans une liste.</p>';
 if(a.type==='navigate')fields+=field('Écran de destination',selectInput(base+'.screen',a.screen,project.screens.map(s=>[s.id,s.name])));
 if(a.type==='validate'){const forms=[];walk(project,n=>{if(n.type==='form')forms.push([n.id,n.name]);});fields+=field('Champs à vérifier',selectInput(base+'.form',a.form||'',[['','L’écran actuel'],...forms]));}
 if(a.type==='if'){
  fields+=(a.conditions||[]).map((c,j)=>`<div class="condition">${operandUI(base+'.conditions.'+j+'.left',c.left)}${selectInput(base+'.conditions.'+j+'.op',c.op,[['eq','est égal à'],['neq','est différent de'],['gt','est supérieur à'],['gte','est supérieur ou égal à'],['lt','est inférieur à'],['lte','est inférieur ou égal à'],['contains','contient'],['empty','est vide']])}${c.op==='empty'?'':operandUI(base+'.conditions.'+j+'.right',c.right,0,conditionValueType(project,c.left))}<button class="action-insert" data-delete-condition="${base+'.conditions.'+j}">Retirer cette condition</button></div>`).join('');
  fields+=selectInput(base+'.join',a.join||'and',[['and','Toutes les conditions (ET)'],['or','Au moins une condition (OU)']])+`<button class="action-insert" data-add-condition="${base}">＋ Condition</button><div class="branch"><strong>ALORS</strong>${actionsUI(a.then||[],base+'.then',depth+1)}</div><div class="branch else"><strong>SINON</strong>${actionsUI(a.else||[],base+'.else',depth+1)}</div>`;
 }
 return `<div draggable="true" data-move-action-block="${base}" class="action-card ${a.type==='if'?'if-card':''}"><div class="action-heading"><span>⠿ ${i+1}. ${esc(actionTypes.find(t=>t[0]===a.type)?.[1]||a.type)}</span><button data-move-action="${base}" data-delta="-1" ${i===0?'disabled':''}>↑</button><button data-move-action="${base}" data-delta="1" ${i===(list.length-1)?'disabled':''}>↓</button><button data-delete-action="${base}" aria-label="Supprimer l’action">✕</button></div>${fields}</div>`;
 }).join('');
 return `<div class="action-target" data-action-target="${path}">${cards||'<p class="help">Déposer une action ici</p>'}<select class="add-action-picker" data-insert-action="${path}"><option value="">＋ Ajouter une action</option>${actionTypes.map(([v,l])=>option(v,l,'')).join('')}</select></div>`;
}
function photoLibrary(src){
 return `<section class="photo-library"><label class="field-label">Photos disponibles · ${photoBank.length}</label><select class="full" data-photo-category aria-label="Thème des photos">${photoCategories.map(([id,label])=>option(id,label,photoCategory)).join('')}</select><input type="search" data-photo-search placeholder="Rechercher une photo" aria-label="Rechercher une photo" value="${esc(photoQuery)}"><div class="asset-bank themed-photos">${photoBank.map(photo=>`<button draggable="true" data-pick-image="${photo.src}" data-photo-theme="${photo.category}" data-photo-label="${esc(normalizeSearch(photo.label))}" title="${esc(photo.label)}" aria-label="Photo : ${esc(photo.label)}" class="${src===photo.src?'selected':''}" ${((photoCategory!=='all'&&photo.category!==photoCategory)||!normalizeSearch(photo.label).includes(normalizeSearch(photoQuery)))?'hidden':''}><img src="${photo.src}" alt="" draggable="false" loading="lazy"><span>${esc(photo.label)}</span></button>`).join('')}</div><p class="help" data-photo-empty hidden>Aucune photo trouvée.</p></section>`;
}
function filterPhotos(bank){let count=0;for(const button of bank.querySelectorAll('[data-pick-image]')){button.hidden=(photoCategory!=='all'&&button.dataset.photoTheme!==photoCategory)||!button.dataset.photoLabel.includes(normalizeSearch(photoQuery));if(!button.hidden)count++;}bank.querySelector('[data-photo-empty]').hidden=!!count;}
function photoOptions(current){return option('','Aucune image',current)+(current&&!photoBank.some(photo=>photo.src===current)?option(current,current.startsWith('data:image/')?'Image importée':'Image actuelle',current):'')+photoCategories.filter(([id])=>id!=='all').map(([id,label])=>`<optgroup label="${esc(label)}">${photoBank.filter(photo=>photo.category===id).map(photo=>option(photo.src,photo.label,current)).join('')}</optgroup>`).join('');}
function imageEditorPreview(props){
 const src=props.srcVariable?project.variables.find(v=>v.name===props.srcVariable)?.initial:props.src;
 const valid=typeof src==='string'&&(/^(data:image\/(png|jpeg|webp|gif);base64,)/.test(src)||/^assets\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(src));
 return valid?`<img class="selected-image" src="${esc(src)}" alt="">`:'<div class="image-empty-preview">Choisis une image ou une donnée image.</div>';
}
function iconPicker(path,value=''){
 const current=String(value).replace(/^icon:/,''),selected=iconChoices.find(i=>i.id===current);
 return `<details class="icon-picker"><summary>Choisir une icône${selected?' · '+esc(selected.label):''}</summary><input type="search" data-icon-filter placeholder="Rechercher une icône" aria-label="Rechercher une icône"><div class="icon-choice-grid"><button type="button" data-icon-choice="" data-icon-path="${path}" data-icon-label="aucune" aria-label="Icône : Aucune">∅<small>Aucune</small></button>${iconChoices.map(i=>`<button type="button" draggable="true" data-icon-choice="${i.id}" data-icon-path="${path}" data-icon-label="${esc(normalizeSearch(i.label))}" class="${current===i.id?'selected':''}" aria-label="Icône : ${esc(i.label)}" aria-pressed="${current===i.id}">${renderAppIcon(i.id)}<small>${esc(i.label)}</small></button>`).join('')}</div></details>`;
}
function renderNodeProps(n){
 let html=field('Nom du composant',input('name',n.name));const x=n.props,defaultBackground=['button','back','badge'].includes(n.type)?project.theme.primary:currentScreen().background,defaultColor=['button','back','badge','input','number','search','date','textarea','select'].includes(n.type)?readableText(n.style.background||(['button','back','badge'].includes(n.type)?project.theme.primary:'#ffffff')):n.style.background?readableText(n.style.background):project.theme.text;
 if(['heading','text','button','back','badge'].includes(n.type))html+=field('Texte',`<textarea data-path="props.text">${esc(x.text)}</textarea>`)+field('Afficher une donnée après le texte',selectInput('props.textVariable',x.textVariable||'',variablesOptions()))+`<details class="advanced"><summary>Texte avec plusieurs données</summary><select class="inline-pick" data-insert-binding="props.text"><option value="">Insérer une donnée…</option>${project.variables.map(v=>option(v.name,v.label||v.name,'')).join('')}</select><p class="help">Les données entre doubles accolades seront remplacées à l’exécution.</p></details>`;
 if(['heading','text','button','back','badge'].includes(n.type)&&x.textVariable)html+=field('Afficher comme',selectInput('props.textFormat',x.textFormat||'text',[['text','Valeur'],['money','Prix en euros'],['percent','Pourcentage'],['count','Nombre d’éléments']]))+field('Texte après la donnée',input('props.textSuffix',x.textSuffix||''));
 if(['button','back','icon'].includes(n.type))html+=iconPicker('props.icon',x.icon||'');
 if(n.type==='camera')html+=field('Libellé',input('props.label',x.label||'Ma photo'))+field('Enregistrer la photo dans',selectInput('props.variable',x.variable,variablesOptions('text')))+field('Caméra',selectInput('props.facing',x.facing||'environment',[['environment','Arrière'],['user','Avant / selfie']]))+field('Taille maximale',selectInput('props.resolution',x.resolution||960,[['640','Compacte (640 px)'],['960','Normale (960 px)'],['1280','Grande (1280 px)']]))+'<p class="help">La photo reste sur cet appareil. Une image peut afficher cette donnée.</p>';
 if(n.type==='icon')html+=field('Taille de l’icône',input('props.iconSize',x.iconSize||40,'number','min="12" max="120"'))+field('Nom accessible',input('props.label',x.label||''));
 if(['button','back'].includes(n.type))html+=field('Position de l’icône',selectInput('props.iconPosition',x.iconPosition||'left',[['left','Avant le texte'],['right','Après le texte']]))+`<label class="toggle-row">Icône seule<input type="checkbox" data-path="props.iconOnly" ${x.iconOnly?'checked':''}></label>`;
 if(n.type==='image')html+=field('Image venant d’une donnée',selectInput('props.srcVariable',x.srcVariable||'',variablesOptions('text')));
 if(['button','back','icon'].includes(n.type)){
  const destination=n.events.click.find(a=>a.type==='navigate'||a.type==='back');
  html+=`<button class="solid-button" data-open-connections-for="${n.id}">↗ Relier à un écran visuellement</button>`+field('Au clic, ouvrir',`<select class="full" data-button-navigation>${option('','Aucun écran (autres actions)',destination?.screen||destination?.type||'')}${option('back','← L’écran précédent',destination?.type)}${project.screens.map(s=>option(s.id,s.name,destination?.screen)).join('')}</select>`);
 }
 if(['input','number','textarea','select','toggle','search','date','range','rating','camera'].includes(n.type))html+=field('Libellé',input('props.label',x.label||''))+field('Enregistrer la saisie dans',selectInput('props.variable',x.variable,variablesOptions(['number','range','rating'].includes(n.type)?'number':n.type==='toggle'?'boolean':'text')))+(['toggle','range','rating','date'].includes(n.type)?'':field('Texte indicatif',input('props.placeholder',x.placeholder||'')))+(n.type==='select'?field('Options (une par ligne)',`<textarea data-path="props.options">${esc(x.options)}</textarea>`):'');
 if(['input','number','textarea','select','toggle','date','rating'].includes(n.type))html+=`<label class="toggle-row">Champ obligatoire<input type="checkbox" data-path="props.required" ${x.required?'checked':''}></label>`;
 if(n.type==='input')html+=field('Type de saisie',selectInput('props.inputType',x.inputType||'text',[['text','Texte'],['email','Adresse e-mail'],['tel','Téléphone'],['url','Adresse de site']]));
 if(['input','textarea'].includes(n.type))html+=`<details class="advanced"><summary>Vérification du texte</summary>${field('Longueur minimale',input('props.minLength',x.minLength||0,'number','min="0" max="10000"'))}</details>`;
 if(n.type==='range')html+=field('Minimum',input('props.min',x.min,'number','step="any"'))+field('Maximum',input('props.max',x.max,'number','step="any"'))+field('Pas',input('props.step',x.step,'number','min="0.01" step="any"'));
 if(n.type==='rating')html+=field('Nombre d’étoiles',input('props.max',x.max||5,'number','min="1" max="10"'));
 if(n.type==='date')html+=`<details class="advanced"><summary>Dates autorisées</summary>${field('À partir du',input('props.minDate',x.minDate||'','date'))}${field('Jusqu’au',input('props.maxDate',x.maxDate||'','date'))}</details>`;
 if(n.type==='timer')html+=field('Libellé',input('props.label',x.label||'Temps restant'))+field('Durée (secondes)',input('props.duration',x.duration||60,'number','min="1" max="86400" step="1"'))+field('Donnée des secondes restantes',selectInput('props.variable',x.variable,variablesOptions('number')))+`<label class="toggle-row">Démarrer automatiquement<input type="checkbox" data-path="props.autoStart" ${x.autoStart?'checked':''}></label><p class="help">Se met en pause en quittant cet écran. Dans Actions, choisis ce qui se passe à la fin du temps.</p>`;
 if(n.type==='progress')html+=field('Libellé',input('props.label',x.label||''))+field('Donnée à afficher',selectInput('props.variable',x.variable,variablesOptions('number')))+field('Valeur maximale',input('props.max',x.max||100,'number','min="1"'));
 if(n.type==='form'||n.type==='accordion')html+=field('Titre',input('props.title',x.title||''));
 if(n.type==='accordion')html+=`<label class="toggle-row">Ouvert au démarrage<input type="checkbox" data-path="props.open" ${x.open?'checked':''}></label>`;
 if(n.type==='image')html+=imageEditorPreview(x)+`${field('Texte alternatif',input('props.alt',x.alt||''))}${field('Hauteur',input('props.height',x.height,'number','min="20" max="1200"'))}${field('Cadrage',selectInput('props.fit',x.fit,[['cover','Remplir'],['contain','Afficher en entier']]))}${photoLibrary(x.src)}<button class="image-upload-button" data-upload-image>Importer une image</button>`;

 if(n.type==='container'){
  html+=field('Disposition',selectInput('props.direction',x.direction,[['column','Empilés'],['row','Côte à côte'],['grid','En colonnes']]))+field('Espacement entre éléments',input('style.gap',n.style.gap,'number','min="0" max="100"'));
  if(x.direction==='grid')html+=field('Nombre de colonnes',selectInput('props.columns',x.columns||2,[['2','2 colonnes'],['3','3 colonnes'],['4','4 colonnes']]))+field('Largeur des colonnes',selectInput('props.columnWidths',x.columnWidths||'1,1',[['1,1','Largeurs égales'],['2,1','Première colonne plus large'],['1,2','Deuxième colonne plus large']]));
 }
 if(n.type==='spacer')html+=field('Hauteur',input('props.height',x.height,'number','min="0" max="1000"'));
 if(['list','products','productDetail','cart'].includes(n.type))html+=field('Liste de données',selectInput('props.variable',x.variable,variablesOptions('list')));
 if(['list','products','productDetail','cart'].includes(n.type)&&x.variable)html+=`<button class="outline-button" data-edit-data="${esc(x.variable)}">Modifier les données</button>`;
 if(n.type==='products')html+=`<button class="solid-button create-detail-button" data-create-detail>Créer la fiche de l’article</button>`;
 if(n.type==='productDetail'){const fields=project.variables.find(v=>v.name===x.variable)?.fields||[];html+=field('Description à afficher',selectInput('props.descriptionField',x.descriptionField||'',[['','Aucune description'],...fields.filter(f=>f.type==='text').map(f=>[f.name,f.label||f.name])]));}
 if(['list','products'].includes(n.type))html+=field('Rechercher avec cette donnée',selectInput('props.searchVariable',x.searchVariable||'',variablesOptions('text')))+field('Trier les éléments',selectInput('props.sortBy',x.sortBy||'none',[['none','Ordre de ma liste'],['name','Nom : A → Z'],...(n.type==='products'?[['priceAsc','Prix croissant'],['priceDesc','Prix décroissant']]:[])]));
 if(n.type==='list')html+=field('Texte à afficher',selectInput('props.itemText',x.itemText,[['{{item}}','L’élément complet'],...((project.variables.find(v=>v.name===x.variable)?.fields)||[]).map(f=>['{{item.'+f.name+'}}',f.label||f.name])]))+`<details class="advanced"><summary>Texte personnalisé</summary>${input('props.itemText',x.itemText)}</details><label class="toggle-row">Bouton de suppression<input type="checkbox" data-path="props.removable" ${x.removable?'checked':''}></label>`;
 if(['list','products','productDetail'].includes(n.type))html+=field('Bouton par élément (facultatif)',input('props.itemButton',x.itemButton||''))+field('Message de liste vide',input('props.empty',x.empty||''));
 if(n.type==='products'||n.type==='productDetail'){
  const fields=project.variables.find(v=>v.name===x.variable)?.fields||[],choices=[['','— Champ —'],...fields.map(f=>[f.name,f.label||f.name])];
  html+='<details class="advanced"><summary>Relier les champs de la liste</summary>'+field('Champ du nom',selectInput('props.nameField',x.nameField,choices))+field('Champ du prix',selectInput('props.priceField',x.priceField,choices))+field('Champ de l’image',selectInput('props.imageField',x.imageField,choices))+'</details>';
 }
 if(n.type==='cart')html+=field('Frais de livraison',input('props.delivery',x.delivery,'number','min="0" step="0.1"'))+field('Livraison offerte dès (0 : désactivé)',input('props.freeAt',x.freeAt,'number','min="0" step="1"'))+field('Donnée contenant la réduction',selectInput('props.discountVariable',x.discountVariable,variablesOptions('number')))+field('Texte du bouton',input('props.checkout',x.checkout));
 html+=field('Ranger dans',`<select class="full" data-move-parent>${containerTargets(project,n.id,screenId).map(([v,l])=>option(v,l,findNode(project,n.id)?.parent?.id||'root')).join('')}</select>`);
 html+='<hr class="mini-divider"><div class="section-label">Apparence</div><div class="form-row">'+field('Taille du texte',input('style.fontSize',n.style.fontSize,'number','min="8" max="72"'))+field('Alignement',selectInput('style.align',n.style.align,[['left','Gauche'],['center','Centre'],['right','Droite']]))+'</div>';
 html+='<div class="form-row">'+field('Couleur du texte',input('style.color',n.style.color||defaultColor,'color'))+field('Couleur du fond',input('style.background',n.style.background||defaultBackground,'color'))+'</div>';
 html+='<details class="advanced"><summary>Dimensions et affichage</summary><div class="form-row">'+field('Marge intérieure',input('style.padding',n.style.padding,'number','min="0" max="100"'))+field('Largeur',selectInput('style.width',n.style.width,['100%','75%','50%','auto']))+'</div>'+field('Arrondi',input('style.radius',n.style.radius??project.theme.radius,'number','min="0" max="80"'))+field('Afficher seulement si cette donnée est vraie',selectInput('props.visibleVariable',x.visibleVariable||'',variablesOptions()))+'</details>';
 html+=`<details class="advanced"><summary>Espaces, cadre et ombre</summary>${field('Espace au-dessus et en dessous',input('style.marginY',n.style.marginY||0,'number','min="0" max="100"'))}${field('Espace à gauche et à droite',input('style.marginX',n.style.marginX||0,'number','min="0" max="80"'))}${field('Épaisseur du cadre',input('style.borderWidth',n.style.borderWidth||0,'number','min="0" max="8"'))}${field('Couleur du cadre',input('style.borderColor',n.style.borderColor||project.theme.primary,'color'))}${field('Ombre',selectInput('style.shadow',n.style.shadow||'none',[['none','Sans ombre'],['soft','Douce'],['raised','Relief']]))}</details>`;
 html+='<button class="outline-button" data-use-app-style>Couleurs et arrondi de l&#8217;appli</button>';
 return html+`<div class="prop-actions"><button data-node-op="up">↑ Monter</button><button data-node-op="down">↓ Descendre</button><button data-node-op="duplicate">Dupliquer</button><button class="danger" data-node-op="delete">Supprimer</button></div>`;
}
function variableEditor(v){
 let html=field('Nom de la donnée',input('label',v.label||v.name))+field('Type',`<input class="full" value="${esc(typeLabels[v.type])}" readonly>`)+`<details class="advanced"><summary>Identifiant technique</summary>${input('name',v.name,'text','readonly')}<button class="outline-button" data-rename-variable>Renommer l’identifiant</button></details>`;
 if(v.type==='computed')html+=field('Calcul',operandUI('formula',v.formula||operand('literal',0)));
 else if(v.type==='number')html+=field('Valeur initiale',input('initial',v.initial,'number','step="any"'));
 else if(v.type==='boolean')html+=field('Valeur initiale',selectInput('initial',String(v.initial),[['true','Vrai'],['false','Faux']],'data-boolean="true"'));
 else if(v.type==='text')html+=field('Valeur initiale',`<textarea data-path="initial">${esc(v.initial)}</textarea>`);
 else{
  html+='<hr class="mini-divider"><div class="section-label">Champs des éléments</div>'+(v.fields||[]).map((f,i)=>`<div class="form-row"><input value="${esc(f.label||f.name)}" data-column-label="${i}"><select data-column-type="${i}" aria-label="Type du champ ${esc(f.label||f.name)}">${[['text','Texte'],['number','Nombre'],['boolean','Oui / non'],['image','Image']].map(([v,l])=>option(v,l,f.type)).join('')}</select><button class="outline-button" data-delete-column="${i}">Retirer</button></div>`).join('')+`<div class="form-row"><input id="new-column-name" placeholder="nom, prix, image…"><select id="new-column-type"><option value="text">Texte</option><option value="number">Nombre</option><option value="image">Image</option><option value="boolean">Oui / non</option></select></div><button class="outline-button" data-add-column style="margin-top:7px">＋ Champ</button>`;
  html+='<hr class="mini-divider"><div class="section-label">Éléments initiaux</div>'+v.initial.map((item,i)=>`<div class="record"><div class="record-heading"><span>Élément ${i+1}</span><button class="record-delete" data-delete-record="${i}">✕</button></div>${(v.fields||[]).length?(v.fields||[]).map(f=>field(esc(f.label||f.name),f.type==='image'?`<select data-record-field="${i}" data-record-key="${esc(f.name)}">${photoOptions(String(item?.[f.name]||''))}</select><button class="image-upload-button" data-upload-record="${i}" data-record-key="${esc(f.name)}">Importer une image</button>`:f.type==='boolean'?`<select data-record-field="${i}" data-record-key="${esc(f.name)}" data-record-type="boolean">${option('true','Vrai',String(item?.[f.name]))}${option('false','Faux',String(item?.[f.name]))}</select>`:`<input type="${f.type==='number'?'number':'text'}" data-record-field="${i}" data-record-key="${esc(f.name)}" value="${esc(item?.[f.name]??'')}" step="any">`)).join(''):`<input data-record-field="${i}" value="${esc(typeof item==='object'?JSON.stringify(item):item)}">`}</div>`).join('')+'<button class="outline-button" data-add-record>＋ Élément</button>';
 }
 return html+'<div class="prop-actions"><button class="danger" data-delete-variable>Supprimer la variable</button></div>';
}
function renderInspector(){
 const n=selected();$('#selection-tools').hidden=!selectedId||!n||inspectorTab!=='props';$('#props-tab').classList.toggle('active',inspectorTab==='props');$('#events-tab').classList.toggle('active',inspectorTab==='actions');$('#events-tab').disabled=!!selectedVariable||!n;
 $('#theme-tab').classList.toggle('active',inspectorTab==='theme');
 let html='';
 if(inspectorTab==='theme'){
  $('#inspector-title').textContent='Style de l’application';
  html=`<div class="section-label">Palettes</div><div class="theme-presets">${themePresets.map(t=>`<button data-theme-preset="${t.id}" title="${esc(t.name)}"><span style="background:${t.background};border-color:${t.text}"><i style="background:${t.primary}"></i><i style="background:${t.text}"></i></span><b>${esc(t.name)}</b></button>`).join('')}</div>`;
  html+=field('Couleur principale',`<input class="full" type="color" data-theme-prop="primary" value="${project.theme.primary}">`)+field('Fond de l’application',`<input class="full" type="color" data-theme-prop="background" value="${project.theme.background}">`)+field('Texte',`<input class="full" type="color" data-theme-prop="text" value="${project.theme.text}">`)+field('Police',`<select class="full" data-theme-prop="font">${appFonts.map(([v,l])=>option(v,l,project.theme.font||'rounded')).join('')}</select>`)+field('Arrondi par défaut',`<input class="full" type="number" min="0" max="60" data-theme-prop="radius" value="${project.theme.radius}">`);
  html+=field('Interrupteur du mode sombre',`<select class="full" data-theme-prop="darkVariable">${option('','Désactivé',project.theme.darkVariable||'')}${variablesOptions('boolean').filter(([name])=>name).map(([name,label])=>option(name,label,project.theme.darkVariable)).join('')}</select>`);
 }
 else if(selectedVariable&&n){$('#inspector-title').textContent=n.label||n.name;html=variableEditor(n);}
 else if(n){$('#inspector-title').textContent=n.name;
  if(inspectorTab==='actions'){
   const events=[...(n.type==='timer'?[['finish','Quand le temps est écoulé']]:[]),['click','Quand on clique'],...(['input','number','textarea','select','toggle','search','date','range','rating','camera'].includes(n.type)?[['change','Quand la valeur change']]:[]),...(['list','products','productDetail'].includes(n.type)?[['item','Quand on clique un élément']]:[])];
   if(!events.some(([v])=>v===eventName))eventName=events[0][0];actionPath='events.'+eventName;
   html=`<div class="event-picker"><label>Quand ?</label><select id="event-picker">${events.map(([v,l])=>option(v,l,eventName)).join('')}</select></div>${actionsUI(n.events[eventName]||[],actionPath)}`;
  }else html=renderNodeProps(n);
 }else{
  $('#inspector-title').textContent=currentScreen().name;
  html=field('Nom de l’écran',`<input class="full" data-screen-prop="name" value="${esc(currentScreen().name)}">`)+field('Fond de l’écran',`<input class="full" type="color" data-screen-prop="background" value="${esc(currentScreen().background||project.theme.background)}">`)+`<button class="outline-button" data-set-home style="margin-top:15px">${project.home===screenId?'⌂ Écran de démarrage':'Définir comme écran de démarrage'}</button><hr class="mini-divider"><div class="section-label">Apparence de l’application</div>`+field('Couleur principale',`<input class="full" type="color" data-theme-prop="primary" value="${project.theme.primary}">`)+field('Couleur du texte',`<input class="full" type="color" data-theme-prop="text" value="${project.theme.text}">`)+field('Arrondi des boutons',`<input class="full" type="number" min="0" max="60" data-theme-prop="radius" value="${project.theme.radius}">`)+`<div class="prop-actions"><button data-duplicate-screen>Dupliquer l’écran</button><button data-delete-screen class="danger" ${project.screens.length===1?'disabled':''}>Supprimer l’écran</button></div>`;
 }
 if(!n&&!selectedVariable&&inspectorTab!=='theme')html+=iconPicker('screen.menuIcon',currentScreen().menuIcon||'')+`<details class="advanced" ${project.navigation?.enabled?'open':''}><summary>Nom et icône dans le menu</summary>${field('Nom court',`<input class="full" data-screen-prop="menuLabel" placeholder="${esc(currentScreen().name)}" value="${esc(currentScreen().menuLabel||'')}">`)}${field('Icône',`<select class="full" data-screen-prop="menuIcon">${[['','Automatique'],...iconChoices.map(i=>['icon:'+i.id,i.label]),['⌂','Maison'],['▦','Grille'],['♥','Cœur'],['★','Étoile'],['☷','Liste'],['●','Rond'],['＋','Plus'],['☺','Profil'],['⚙','Paramètres'],['▣','Panier']].map(([v,l])=>option(v,(v?v+' ':'')+l,currentScreen().menuIcon||'')).join('')}</select>`)}</details>`;
 if(n&&selectedId&&inspectorTab==='props'){const crumbs=[];let entry=findNode(project,selectedId);while(entry){crumbs.unshift({id:entry.node.id,name:entry.node.name});entry=entry.parent?findNode(project,entry.parent.id):null;}html=`<div class="selection-crumbs"><button data-select-root>${esc(currentScreen().name)}</button>${crumbs.map(c=>`<span>›</span><button data-select-node="${c.id}">${esc(c.name)}</button>`).join('')}</div>`+html;}$('#inspector-content').innerHTML=html;const bank=$('#inspector-content .photo-library');if(bank)filterPhotos(bank);
}
function issues(){return projectIssues(project);}
function renderIssues(){const list=issues();$('#issues-button').textContent=list.length?list.length+' liaison'+(list.length>1?'s':'')+' à vérifier':'';$('#issues-button').className=list.length?'warning':'';}
function refreshPlayer(){
 try{player.update(project,{design:mode==='design',selected:selectedId,screen:screenId,reset:mode==='design'});}catch(error){$('#canvas-status').textContent=error.message;return;}
 $('#canvas-status').textContent=(mode==='design'?'Conception':'Test')+' · '+currentScreen().name;
 $('#design-mode').classList.toggle('active',mode==='design');$('#test-mode').classList.toggle('active',mode==='test');
}
function renderAll(){renderScreensPicker();renderLibrary();renderInspector();if(player)refreshPlayer();renderIssues();flowUI?.refresh();}
function insertAction(type,path=null,index=null){const n=findNode(project,selectedId)?.node;if(!n){$('#canvas-status').textContent='Sélectionne un composant pour lui ajouter une action.';return;}commit(()=>{inspectorTab='actions';if(!path)path='events.'+eventName;let list=safeGet(n,path);if(!Array.isArray(list)){safeSet(n,path,[]);list=safeGet(n,path);}list.splice(index===null?list.length:index,0,action(type,project));});}
function addScreen(){commit(()=>{const s={id:uid('screen'),name:'Écran '+(project.screens.length+1),background:project.theme.background,nodes:[]};project.screens.push(s);screenId=s.id;selectedId=selectedVariable=null;});}
function mutateProperty(input,redraw=false){const target=selected();if(!target)return;const path=input.dataset.path;if(path==='props.srcVariable')imageJob++;let next=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.dataset.boolean==='true'?input.value==='true':input.value;if(input.type==='number'){if(!Number.isFinite(next))return;if(input.min!=='')next=Math.max(Number(input.min),next);if(input.max!=='')next=Math.min(Number(input.max),next);}
 commit(()=>{
  if(selectedVariable&&path==='label')delete target.autoLabelFrom;
  if(input.dataset.operandKind){next=operand(next,next==='variable'?project.variables[0]?.name||'':'');if(next.kind==='math')next=operand('math');safeSet(target,input.dataset.operandKind,next);}
  else {if(target.type==='timer'&&path==='props.duration')next=Math.round(next);safeSet(target,path,next);if(target.type==='timer'&&path==='props.duration'){const v=project.variables.find(v=>v.name===target.props.variable&&v.autoLabelFrom===target.id);if(v)v.initial=next;}if(path==='props.columns'&&target.props.columnLayout){const count=Number(next);while(target.children.length<count){const c=component('container',project);c.name='Colonne '+(target.children.length+1);c.style.padding=4;target.children.push(c);}}if(path==='props.variable'&&['products','productDetail'].includes(target.type)){const fields=project.variables.find(v=>v.name===next)?.fields||[];target.props.nameField=fields.find(f=>f.type==='text')?.name||'name';target.props.priceField=fields.find(f=>f.type==='number')?.name||'price';target.props.imageField=fields.find(f=>f.type==='image')?.name||'image';}if(path==='props.variable'&&target.type==='list'){const f=project.variables.find(v=>v.name===next)?.fields?.find(f=>f.type==='text');target.props.itemText=f?'{{item.'+f.name+'}}':'{{item}}';}}
  if(input.dataset.operandKind||path.endsWith('.variable')||path.endsWith('.left.name'))normalizeActionInputs(project,target);
 },{redraw:redraw||!!input.dataset.operandKind,key:(selectedVariable||selectedId)+'.'+path});
}
document.addEventListener('input',event=>{
 if(event.target.hasAttribute('data-photo-search')){photoQuery=event.target.value;filterPhotos(event.target.closest('.photo-library'));return;}
 if(event.target.hasAttribute('data-icon-filter')){const query=normalizeSearch(event.target.value);for(const button of event.target.closest('.icon-picker').querySelectorAll('[data-icon-choice]'))button.hidden=!button.dataset.iconLabel.includes(query);return;}
 const el=event.target;if(el.matches('select'))return;
 if(el.id==='component-search'){componentQuery=el.value;renderLibrary();return;}
 if(el.id==='model-search'){modelQuery=el.value;renderLibrary();return;}
 if(el.id==='project-library-search'){renderProjectLibrary();return;}
 if(el.dataset.navigationProp){commit(()=>setNavigation(project,{[el.dataset.navigationProp]:el.checked}));return;}
 if(el.dataset.navigationItem){commit(()=>{const nav=navigationSettings(project);setNavigation(project,{items:el.checked?[...nav.items,el.dataset.navigationItem]:nav.items.filter(id=>id!==el.dataset.navigationItem)});});return;}
 if(el.dataset.path)mutateProperty(el);
 if(el.dataset.columnLabel!==undefined&&selectedVariable)commit(()=>selected().fields[Number(el.dataset.columnLabel)].label=el.value,{redraw:false,key:'column-label-'+el.dataset.columnLabel});
 if(el.id==='project-name')commit(()=>project.name=el.value,{redraw:false,key:'project-name'});
 if(el.dataset.screenProp)commit(()=>currentScreen()[el.dataset.screenProp]=el.value,{redraw:false,key:screenId+'.'+el.dataset.screenProp});
 if(el.dataset.themeProp)commit(()=>{if(el.dataset.themeProp==='background')setAppBackground(project,el.value);else project.theme[el.dataset.themeProp]=el.type==='number'?Math.min(Number(el.max||60),Math.max(Number(el.min||0),Number(el.value))):el.value;},{redraw:false,key:'theme.'+el.dataset.themeProp});
 if(el.dataset.recordField!==undefined)updateRecord(el);
});
function updateRecord(el){const v=selected();if(!v||v.type!=='list')return;const index=Number(el.dataset.recordField);const val=el.type==='number'?Number(el.value):el.dataset.recordType==='boolean'?el.value==='true':el.value;commit(()=>{if(el.dataset.recordKey){if(!v.initial[index]||typeof v.initial[index]!=='object')v.initial[index]={};v.initial[index][el.dataset.recordKey]=val;}else v.initial[index]=val;},{redraw:false,key:v.name+'.'+index+'.'+(el.dataset.recordKey||'')});}
document.addEventListener('change',event=>{
 if(event.target.hasAttribute('data-photo-category')){photoCategory=event.target.value;filterPhotos(event.target.closest('.photo-library'));return;}
 const el=event.target;
 if(el.dataset.projectName){try{const name=el.value.trim()||'Mon application';if(el.dataset.projectName===project.id)commit(()=>project.name=name,{redraw:false});else{const record=listProjects(localStorage).find(r=>r.project.id===el.dataset.projectName);if(record){record.project.name=name;archiveProject(localStorage,record.project);}}renderProjectLibrary();}catch(error){projectError(error);}return;}
 if(el.id==='component-category'){componentCategory=el.value;renderLibrary();return;}
 if(el.tagName==='SELECT'&&el.dataset.themeProp){commit(()=>project.theme[el.dataset.themeProp]=el.value);return;}
 if(el.dataset.columnType!==undefined){const v=selected(),index=Number(el.dataset.columnType),previous=v?.fields?.[index]?.type;try{commit(()=>{changeListFieldType(v,index,el.value);connectListFields(project,v);});}catch(error){el.value=previous;$('#canvas-status').textContent=error.message;}return;}
 if(el.dataset.moveParent!==undefined){commit(()=>moveNode(project,selectedId,el.value,screenId));return;}
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
 if(b.hasAttribute('data-use-app-style')){const n=selected();if(n)commit(()=>{n.style.color='';n.style.background='';delete n.style.radius;});return;}
 if(b.dataset.themePreset){commit(()=>applyThemePreset(project,b.dataset.themePreset));return;}
 if(b.dataset.openConnectionsFor){flowUI?.openFor(b.dataset.openConnectionsFor);return;}
 if(b.dataset.editData){selectedVariable=b.dataset.editData;selectedId=null;libraryTab='data';inspectorTab='props';renderAll();return;}
 if(b.hasAttribute('data-create-detail')){const n=selected();if(n?.type!=='products')return;if(n.events.item.some(a=>a.type!=='cartAdd')&&!confirm('Relier ce catalogue à une nouvelle fiche ? Ses actions actuelles sur les articles seront remplacées.'))return;try{commit(()=>{const result=createProductDetails(project,n.id);screenId=result.screen.id;selectedId=result.node.id;selectedVariable=null;eventName='item';inspectorTab='props';libraryTab='screens';mode='design';});}catch(error){$('#canvas-status').textContent=error.message;}return;}
 if(b.hasAttribute('data-download-library')){const status=projectLibraryStatus(localStorage);if(status.raw){download(status.raw,'application/json','bibliotheque-a-recuperer.json');libraryCopyDownloaded=true;}return;}
 if(b.hasAttribute('data-repair-library')){if(!confirm('Remplacer la bibliothèque illisible ? L’application ouverte sera conservée.'))return;try{repairProjectLibrary(localStorage,project,libraryCopyDownloaded);$('#projects-error').hidden=true;renderProjectLibrary();save();}catch(error){projectError(error);}return;}
 if(b.dataset.recoverCopy){const copy=listRecoveries(localStorage).find(c=>c.key===b.dataset.recoverCopy);if(copy)download(copy.raw,'application/json','copie-a-recuperer.json');return;}
 if(b.dataset.deleteRecovery){if(b.dataset.deleteRecovery.startsWith(recoveryPrefix)&&confirm('Supprimer cette copie de récupération ? Télécharge-la d’abord si tu veux la garder.')){localStorage.removeItem(b.dataset.deleteRecovery);renderProjectLibrary();}return;}
 if(b.dataset.projectOpen){const record=listProjects(localStorage).find(r=>r.project.id===b.dataset.projectOpen);if(record&&activateProject(record.project))$('#projects-dialog').close();return;}
 if(b.dataset.projectCopy){const source=b.dataset.projectCopy===project.id?project:listProjects(localStorage).find(r=>r.project.id===b.dataset.projectCopy)?.project;if(source){const copy=structuredClone(source);copy.id=uid('app');copy.name+=' copie';if(activateProject(copy))$('#projects-dialog').close();}return;}
 if(b.dataset.projectDelete){if(!confirm('Supprimer cette application de cet ordinateur ?'))return;try{removeProject(localStorage,b.dataset.projectDelete,project.id);renderProjectLibrary();}catch(error){projectError(error);}return;}
 if(b.hasAttribute('data-select-root')){selectedId=selectedVariable=null;inspectorTab='props';renderAll();return;}
 if(b.dataset.emptyList){commit(()=>safeSet(selected(),b.dataset.emptyList,[]));return;}
 if(b.dataset.tab){libraryTab=b.dataset.tab;renderLibrary();return;}
 if(b.hasAttribute('data-open-navigation')){commit(()=>{libraryTab='screens';setNavigation(project,{enabled:true});});document.querySelector('.navigation-config')?.scrollIntoView({block:'start'});return;}
 if(b.hasAttribute('data-icon-choice')){commit(()=>{const value=b.dataset.iconChoice;if(b.dataset.iconPath==='screen.menuIcon')currentScreen().menuIcon=value?'icon:'+value:'';else if(selected()){const n=selected(),previous=iconChoices.find(i=>i.id===n.props?.icon);if(n.type==='icon'&&(!n.props.label||n.props.label===previous?.label))n.props.label=iconChoices.find(i=>i.id===value)?.label||'Icône';safeSet(n,b.dataset.iconPath,value);}});return;}
 if(b.dataset.orderNavigation){commit(()=>moveNavigationItem(project,b.dataset.orderNavigation,Number(b.dataset.delta)));return;}
 if(b.hasAttribute('data-create-settings')){commit(()=>{const s=addScreenTemplate(project,'settings');screenId=s.id;selectedId=selectedVariable=null;setNavigation(project,{enabled:true,headerIcon:'settings',settingsScreen:s.id});});return;}
 if(b.dataset.screenModel){commit(()=>{screenId=addScreenTemplate(project,b.dataset.screenModel).id;selectedId=selectedVariable=null;mode='design';});return;}
 if(b.dataset.addLayout){addNode('container',0,b.dataset.addLayout);return;}
 if(b.dataset.addColumns){addNode('container',Number(b.dataset.addColumns));return;}
 if(b.dataset.addComponent){addNode(b.dataset.addComponent);return;}
 if(b.dataset.selectNode){selectNode(b.dataset.selectNode);return;}
 if(b.hasAttribute('data-add-screen')){addScreen();return;}
 if(b.dataset.openScreen||b.dataset.screenSettings){screenId=b.dataset.openScreen||b.dataset.screenSettings;selectedId=selectedVariable=null;renderAll();return;}
 if(b.dataset.selectVariable){selectedVariable=b.dataset.selectVariable;selectedId=null;inspectorTab='props';renderInspector();renderLibrary();return;}
 if(b.hasAttribute('data-create-variable')){const name=$('#variable-name').value,type=$('#variable-type').value;if(!name.trim())return;commit(()=>{const v=variable(project,name,type,type==='number'?0:type==='boolean'?false:type==='list'?[]:'');v.label=name;if(type==='computed')v.formula=operand('literal',0);selectedVariable=v.name;selectedId=null;});return;}
 if(b.dataset.quickVariable){const label=prompt('Nom de la nouvelle donnée (ex. score, prénom, tâches)');if(!label?.trim())return;commit(()=>{const type=b.dataset.quickType,v=variable(project,label,type,type==='number'?0:type==='list'?[]:'');v.label=label;safeSet(selected(),b.dataset.quickVariable,v.name);});return;}
 if(b.dataset.nodeOp){const info=findNode(project,selectedId);if(!info)return;commit(()=>{const index=info.siblings.findIndex(n=>n.id===selectedId),op=b.dataset.nodeOp;if(op==='delete'){info.siblings.splice(index,1);selectedId=null;}if(op==='duplicate'){const copy=duplicateNode(info.node);info.siblings.splice(index+1,0,copy);selectedId=copy.id;}if(op==='up'&&index>0)[info.siblings[index-1],info.siblings[index]]=[info.siblings[index],info.siblings[index-1]];if(op==='down'&&index<info.siblings.length-1)[info.siblings[index+1],info.siblings[index]]=[info.siblings[index],info.siblings[index+1]];});return;}
 if(b.dataset.pickImage){imageJob++;commit(()=>{const n=selected(),previous=photoBank.find(photo=>photo.src===n.props.src),photo=photoBank.find(photo=>photo.src===b.dataset.pickImage);if(!n.props.alt||n.props.alt==='Image'||n.props.alt===previous?.label)n.props.alt=photo?.label||'Image';n.props.src=b.dataset.pickImage;n.props.srcVariable='';});return;}
 if(b.hasAttribute('data-upload-image')){uploadTarget={node:selectedId};$('#image-upload').click();return;}
 if(b.dataset.uploadRecord!==undefined){uploadTarget={variable:selectedVariable,index:Number(b.dataset.uploadRecord),key:b.dataset.recordKey};$('#image-upload').click();return;}
 if(b.dataset.addAction){insertAction(b.dataset.addAction);return;}
 if(b.dataset.deleteAction||b.dataset.moveAction){const path=b.dataset.deleteAction||b.dataset.moveAction,parts=path.split('.'),index=Number(parts.pop()),n=selected();commit(()=>{const list=safeGet(n,parts.join('.'));if(b.dataset.deleteAction)list.splice(index,1);else{const to=index+Number(b.dataset.delta);[list[index],list[to]]=[list[to],list[index]];}});return;}
 if(b.dataset.addCondition){commit(()=>safeGet(selected(),b.dataset.addCondition).conditions.push({left:operand('literal',''),op:'eq',right:operand('literal','')}));return;}
 if(b.dataset.deleteCondition){const parts=b.dataset.deleteCondition.split('.'),index=Number(parts.pop());commit(()=>safeGet(selected(),parts.join('.')).splice(index,1));return;}
 if(b.hasAttribute('data-set-home')){commit(()=>project.home=screenId);return;}
 if(b.hasAttribute('data-duplicate-screen')){commit(()=>{const s=duplicateScreen(project,screenId);screenId=s.id;selectedId=selectedVariable=null;});return;}
 if(b.hasAttribute('data-delete-screen')){if(project.screens.length<2||!confirm('Supprimer cet écran et ses composants ?'))return;commit(()=>{project.screens=project.screens.filter(s=>s.id!==screenId);if(project.home===screenId)project.home=project.screens[0].id;screenId=project.screens[0].id;selectedId=null;});return;}
 if(b.hasAttribute('data-add-record')){commit(()=>{const v=selected(),fields=v.fields||[];v.initial.push(fields.length?Object.fromEntries(fields.map(f=>[f.name,f.type==='number'?0:f.type==='boolean'?false:''])):'Nouvel élément');});return;}
 if(b.dataset.deleteRecord!==undefined){commit(()=>selected().initial.splice(Number(b.dataset.deleteRecord),1));return;}
 if(b.hasAttribute('data-add-column')){const label=$('#new-column-name').value.trim(),name=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_]+/g,'_'),type=$('#new-column-type').value;if(!/^[a-zA-Z_]\w*$/.test(name)||['__proto__','constructor','prototype'].includes(name)){ $('#canvas-status').textContent='Donne un nom à ce champ.';return;}if(selected().fields.some(f=>f.name===name))return;commit(()=>{const v=selected();addListField(v,{name,label,type});connectListFields(project,v);});return;}
 if(b.dataset.deleteColumn!==undefined){commit(()=>{const v=selected(),[f]=v.fields.splice(Number(b.dataset.deleteColumn),1);for(const row of v.initial)if(row&&typeof row==='object')delete row[f.name];});return;}
 if(b.hasAttribute('data-delete-variable')){if(!confirm('Supprimer cette variable ? Les composants liés devront être reconfigurés.'))return;commit(()=>{project.variables=project.variables.filter(v=>v.name!==selectedVariable);selectedVariable=null;});return;}
 if(b.hasAttribute('data-rename-variable')){const previous=selectedVariable,next=prompt('Nouvel identifiant de la variable',previous);if(!next||!/^\w+$/.test(next)||['__proto__','constructor','prototype'].includes(next)||project.variables.some(v=>v.name===next))return;commit(()=>{const visit=obj=>{if(!obj||typeof obj!=='object')return;for(const [k,v]of Object.entries(obj)){if(typeof v==='string'){if(['variable','discountVariable','visibleVariable','textVariable','darkVariable'].includes(k)&&v===previous||['variable','length','cartTotal'].includes(obj.kind)&&k==='name'&&v===previous)obj[k]=next;else obj[k]=v.replaceAll('{{'+previous+'}}','{{'+next+'}}').replaceAll('{{'+previous+'.','{{'+next+'.');}else visit(v);}};selected().name=next;visit(project);selectedVariable=next;});return;}
 if(b.dataset.template){const next=b.dataset.template==='starter'?starterProject():b.dataset.template==='mobile'?mobileAppTemplate():b.dataset.template==='restaurant'?restaurantTemplate():b.dataset.template==='tasks'?tasksTemplate():blankProject();if(activateProject(next))$('#new-dialog').close();return;}
 if(b.dataset.close){if(b.dataset.close==='preview-dialog')previewPlayer?.destroy();$('#'+b.dataset.close).close();}
});
$('#image-upload').onchange=async event=>{
 const file=event.target.files[0],target=uploadTarget;if(!file||!target)return;
 const job=++imageJob,projectId=project.id,originalNode=target.node?findNode(project,target.node)?.node:null,originalRecord=target.variable?project.variables.find(v=>v.name===target.variable)?.initial[target.index]:null;
 $('#save-status').textContent='Import de l’image…';
 try{
  if(target.node&&!originalNode)throw Error('Cet élément a été supprimé.');
  const prepared=await prepareImage(file);if(job!==imageJob)return;
  if(project.id!==projectId)throw Error('Import annulé : l’application ouverte a changé.');
  if(target.node&&findNode(project,target.node)?.node!==originalNode)throw Error('Import annulé : cet élément a changé.');
  let recordIndex=target.index;
  if(target.variable){const variable=project.variables.find(v=>v.name===target.variable);if(originalRecord&&typeof originalRecord==='object')recordIndex=variable?.initial.indexOf(originalRecord)??-1;
   if(!variable||recordIndex<0||recordIndex>=variable.initial.length||variable.initial[recordIndex]!==originalRecord||!variable.fields.some(f=>f.name===target.key&&f.type==='image'))throw Error('Import annulé : cette ligne a changé.');
  }
  commit(()=>{if(target.node){const n=findNode(project,target.node).node;n.props.src=prepared.src;n.props.srcVariable='';}else{const v=project.variables.find(v=>v.name===target.variable);if(!v.initial[recordIndex]||typeof v.initial[recordIndex]!=='object')v.initial[recordIndex]={};v.initial[recordIndex][target.key]=prepared.src;}});
  if($('#save-status').textContent==='Enregistré sur cet ordinateur')$('#save-status').textContent='Image importée · '+Math.max(1,Math.round(prepared.bytes/1024))+' Ko';
 }catch(error){if(job===imageJob)$('#save-status').textContent=error.message;}
 finally{if(job===imageJob){event.target.value='';uploadTarget=null;}}
};

const dropMarker=document.createElement('div');dropMarker.id='studio-drop-marker';dropMarker.hidden=true;dropMarker.setAttribute('aria-hidden','true');document.body.append(dropMarker);
function clearDragMarks(){dropMarker.hidden=true;dropMarker.className='';document.querySelectorAll('.drop-destination').forEach(el=>el.classList.remove('drop-destination'));}
function elementPlacement(event){
 const tree=event.target.closest('[data-select-node]');
 if(tree&&tree.closest('#library-content')){const info=findNode(project,tree.dataset.selectNode);if(!info)return null;const rect=tree.getBoundingClientRect(),inside=['container','form','accordion'].includes(info.node.type)&&event.clientY>rect.top+rect.height*.25&&event.clientY<rect.bottom-rect.height*.25;return {parent:inside?info.node.id:info.parent?.id||'root',index:inside?info.node.children.length:info.siblings.indexOf(info.node)+(event.clientY>rect.top+rect.height/2?1:0),zone:tree,line:inside?null:{left:rect.left,top:inside?rect.top:event.clientY>rect.top+rect.height/2?rect.bottom:rect.top,width:rect.width,height:4}};}
 if(!event.target.closest('#player'))return null;
 const wrapper=event.target.closest('[data-player-node]'),info=wrapper?findNode(project,wrapper.dataset.playerNode):null;
 if(dragItem.photo&&info?.node.type==='image'||dragItem.icon&&['button','back','icon'].includes(info?.node.type))return {replace:info.node.id,zone:wrapper};
 let zone=event.target.closest('[data-player-drop]');
 if(info&&['container','form','accordion'].includes(info.node.type)){const r=wrapper.getBoundingClientRect();if(event.clientY<r.top+12||event.clientY>r.bottom-12)zone=wrapper.parentElement.closest('[data-player-drop]');else zone=wrapper.querySelector('[data-player-drop="'+info.node.id+'"]')||zone;}
 zone=zone||$('#player .rt-screen');if(!zone)return null;const parent=zone.dataset.playerDrop||'root',parentNode=parent==='root'?null:findNode(project,parent)?.node,siblings=parentNode?parentNode.children:currentScreen().nodes;
 const children=[...zone.children].filter(el=>el.hasAttribute('data-player-node')),rects=children.map(el=>el.getBoundingClientRect()),horizontal=parentNode?.props.direction==='row',grid=parentNode?.props.direction==='grid',at=insertionIndex(rects,event.clientX,event.clientY,horizontal,grid),before=children[at],index=before?siblings.findIndex(n=>n.id===before.dataset.playerNode):siblings.length;
 const r=before?.getBoundingClientRect()||children.at(-1)?.getBoundingClientRect(),bounds=zone.getBoundingClientRect();
 const line=horizontal||grid?{left:r?(before?r.left:r.right):bounds.left+5,top:r?.top||bounds.top+5,width:4,height:Math.max(20,r?.height||bounds.height-10)}:{left:bounds.left+4,top:r?(before?r.top:r.bottom):bounds.top+8,width:Math.max(20,bounds.width-8),height:4};
 return {parent,index,zone,line};
}
function editorDrop(event){
 if(!dragItem||dragItem.projectId!==project.id)return null;
 if(dragItem.action||dragItem.moveAction){const zone=event.target.closest('[data-action-target]');if(!zone||!zone.closest('#inspector-content')||dragItem.nodeId!==selectedId)return null;const path=zone.dataset.actionTarget;if(dragItem.moveAction&&path.startsWith(dragItem.moveAction+'.'))return null;const children=[...zone.children].filter(el=>el.classList.contains('action-card')),at=insertionIndex(children.map(el=>el.getBoundingClientRect()),event.clientX,event.clientY),r=(children[at]||children.at(-1))?.getBoundingClientRect(),bounds=zone.getBoundingClientRect();return {actionPath:path,index:at,zone,line:{left:bounds.left+4,top:r?(children[at]?r.top:r.bottom):bounds.top+7,width:bounds.width-8,height:4}};}
 if(mode!=='design')return null;const place=elementPlacement(event);if(!place)return null;
 if(dragItem.move){let parent=place.parent==='root'?null:findNode(project,place.parent);while(parent){if(parent.node.id===dragItem.move)return null;parent=parent.parent?findNode(project,parent.parent.id):null;}}
 return place;
}
function showDragMark(place){clearDragMarks();if(!place)return;place.zone.classList.add('drop-destination');dropMarker.hidden=false;
 if(dragItem.menu||dragItem.model||place.replace){const r=place.zone.getBoundingClientRect();dropMarker.className='drop-label';dropMarker.textContent=dragItem.menu?'Ajouter le menu':dragItem.model?'Créer un nouvel écran':dragItem.photo?'Remplacer la photo':'Ajouter l’icône';Object.assign(dropMarker.style,{left:(r.left+6)+'px',top:(r.top+6)+'px',width:'auto',height:'auto'});}
 else{dropMarker.textContent='';Object.assign(dropMarker.style,Object.fromEntries(Object.entries(place.line).map(([key,value])=>[key,value+'px'])));}
}
document.addEventListener('dragstart',event=>{
 const c=event.target.closest('[data-add-component],[data-add-action],[data-add-columns],[data-add-layout],[data-move-node],[data-open-navigation],[data-screen-model],[data-pick-image],[data-icon-choice],[data-move-action-block]');if(!c||!c.closest('#library-content,#player,#inspector-content')||c.disabled)return;
 if(event.target.matches('input,textarea,select')||c.dataset.moveNode&&mode!=='design')return;
 const photo=photoBank.find(photo=>photo.src===c.dataset.pickImage),icon=iconChoices.find(icon=>icon.id===c.dataset.iconChoice);
 dragItem=c.dataset.addLayout?{layout:c.dataset.addLayout}:c.dataset.addColumns?{columns:Number(c.dataset.addColumns)}:c.dataset.moveNode?{move:c.dataset.moveNode}:c.dataset.addComponent?{component:c.dataset.addComponent}:c.hasAttribute('data-open-navigation')?{menu:true}:c.dataset.screenModel?{model:c.dataset.screenModel}:photo?{photo:photo.src,alt:photo.label}:icon?{icon:icon.id,label:icon.label}:c.dataset.moveActionBlock?{moveAction:c.dataset.moveActionBlock}:c.dataset.addAction?{action:c.dataset.addAction}:null;
 if(!dragItem){event.preventDefault();return;}Object.assign(dragItem,{projectId:project.id,nodeId:selectedId});event.dataTransfer.setData('application/x-juvign-element',JSON.stringify(dragItem));event.dataTransfer.setData('text/plain',JSON.stringify(dragItem));event.dataTransfer.effectAllowed=dragItem.move||dragItem.moveAction?'move':'copy';
});
document.addEventListener('dragover',event=>{const place=editorDrop(event);if(!place){clearDragMarks();return;}event.preventDefault();event.dataTransfer.dropEffect=dragItem.move||dragItem.moveAction?'move':'copy';showDragMark(place);const scroll=place.zone.closest('.rt-screen'),r=scroll?.getBoundingClientRect();if(r){if(event.clientY>r.bottom-28)scroll.scrollTop+=12;else if(event.clientY<r.top+28)scroll.scrollTop-=12;}});
document.addEventListener('dragleave',event=>{if(!event.relatedTarget)clearDragMarks();});
document.addEventListener('dragend',()=>{dragItem=null;clearDragMarks();});
window.addEventListener('blur',()=>{dragItem=null;clearDragMarks();});
document.addEventListener('drop',event=>{
 const place=editorDrop(event);if(!place){dragItem=null;clearDragMarks();return;}event.preventDefault();event.stopPropagation();const item=dragItem;dragItem=null;clearDragMarks();
 try{
  if(place.actionPath){if(item.moveAction)commit(()=>moveActionBlock(selected(),item.moveAction,place.actionPath,place.index));else insertAction(item.action,place.actionPath,place.index);return;}
  if(item.menu){commit(()=>{setNavigation(project,{enabled:true});libraryTab='screens';});return;}
  if(item.model){commit(()=>{screenId=addScreenTemplate(project,item.model).id;selectedId=selectedVariable=null;mode='design';});return;}
  if(place.replace){commit(()=>{const n=findNode(project,place.replace)?.node;if(!n)return;if(item.photo){const previous=photoBank.find(photo=>photo.src===n.props.src);if(!n.props.alt||n.props.alt==='Image'||n.props.alt===previous?.label)n.props.alt=item.alt;n.props.src=item.photo;n.props.srcVariable='';}else{n.props.icon=item.icon;if(n.type==='icon')n.props.label=item.label;}selectedId=n.id;selectedVariable=null;inspectorTab='props';});return;}
  if(item.move){commit(()=>{if(moveNode(project,item.move,place.parent,screenId,place.index)){selectedId=item.move;selectedVariable=null;inspectorTab='props';}});return;}
  addNode(item.photo?'image':item.icon?'icon':item.component||'container',item.columns||0,item.layout||'',place,item.photo?{src:item.photo,alt:item.alt}:item.icon?{icon:item.icon,label:item.label}:null);
 }catch(error){projectError(error);}
});
$('#props-tab').onclick=()=>{inspectorTab='props';renderInspector();};$('#events-tab').onclick=()=>{inspectorTab='actions';eventName=selected()?.type==='timer'?'finish':['list','products','productDetail'].includes(selected()?.type)?'item':['input','number','textarea','select','toggle','search','date','range','rating','camera'].includes(selected()?.type)?'change':'click';renderInspector();};
$('#theme-tab').onclick=()=>{inspectorTab='theme';renderInspector();};
$('#deselect').onclick=()=>{selectedId=selectedVariable=null;inspectorTab='props';renderAll();};
$('#screen-picker').onchange=event=>{screenId=event.target.value;selectedId=selectedVariable=null;renderAll();};$('#add-screen').onclick=addScreen;
$('#design-mode').onclick=()=>{mode='design';if(findNode(project,selectedId)?.screen.id!==screenId)selectedId=null;renderAll();};$('#test-mode').onclick=()=>{mode='test';refreshPlayer();};$('#reset-test').onclick=()=>{player.reset();screenId=project.home;renderScreensPicker();};
$('#undo').onclick=()=>{if(!history.length)return;lastEdit='';future.push(editorSnapshot());restoreEditor(history.pop());};
$('#redo').onclick=()=>{if(!future.length)return;lastEdit='';history.push(editorSnapshot());restoreEditor(future.pop());};
document.addEventListener('keydown',event=>{
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||document.querySelector('dialog[open]'))return;
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();(event.shiftKey?$('#redo'):$('#undo')).click();return;}
 if(mode!=='design'||!selectedId||inspectorTab!=='props'||event.repeat)return;
 const operation=(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'?'duplicate':event.key==='Delete'?'delete':event.altKey&&event.key==='ArrowUp'?'up':event.altKey&&event.key==='ArrowDown'?'down':null;
 if(operation){event.preventDefault();$('#selection-tools [data-node-op="'+operation+'"]').click();}
});
function hideRecoveryBanner(){$('#recovery-banner').hidden=true;document.body.classList.remove('with-recovery');}
$('#recover-project').onclick=()=>{if(!recovery)return;download(recovery.raw,'application/json','ancienne-application.json');recovery.blocked=false;hideRecoveryBanner();save();};
$('#dismiss-recovery').onclick=()=>{if(!recovery?.blocked)hideRecoveryBanner();};
if(recovery){$('#recovery-banner').hidden=false;document.body.classList.add('with-recovery');$('#dismiss-recovery').disabled=recovery.blocked;}
$('#new-project').onclick=()=>{$('#new-project-error').hidden=true;$('#new-dialog').showModal();};
$('#projects').onclick=()=>{$('#projects-error').hidden=true;try{archiveProject(localStorage,project);}catch(error){projectError(error);}renderProjectLibrary();$('#projects-dialog').showModal();};
$('#projects-new').onclick=()=>{$('#projects-dialog').close();$('#new-project').click();};
let previewPlayer;
$('#preview-app').onclick=()=>{const root=document.createElement('main');root.className='app-player';previewPlayer?.destroy();$('#preview-host').replaceChildren(root);$('#preview-dialog').showModal();previewPlayer=createPlayer(root,project);};
$('#preview-reset').onclick=()=>previewPlayer?.reset();
$('#preview-dialog').addEventListener('close',()=>{if($('#preview-dialog').open)return;previewPlayer?.destroy();$('#preview-host').replaceChildren();previewPlayer=null;});
$('#preview-dialog').addEventListener('cancel',()=>previewPlayer?.destroy());
function presentData(value,fields=[],depth=0){
 if(value===undefined||value===null)return '<span class="data-empty">Non renseigné</span>';
 if(typeof value==='boolean')return value?'Oui':'Non';
 if(typeof value==='number')return esc(value.toLocaleString('fr-FR'));
 if(typeof value==='string')return value.startsWith('data:image/')?'Image importée':value?esc(value):'<span class="data-empty">Vide</span>';
 if(depth>3)return 'Données imbriquées';
 if(Array.isArray(value))return `<details><summary>${value.length} élément${value.length>1?'s':''}</summary><ol>${value.slice(0,20).map(item=>`<li>${presentData(item,fields,depth+1)}</li>`).join('')}</ol>${value.length>20?'<small>20 premiers éléments affichés.</small>':''}</details>`;
 return `<dl>${Object.entries(value).map(([key,v])=>`<dt>${esc(fields.find(f=>f.name===key)?.label||key)}</dt><dd>${presentData(v,[],depth+1)}</dd>`).join('')}</dl>`;
}
function showState(title,data){
 $('#state-title').textContent=title;
 if(Array.isArray(data))$('#state-content').innerHTML=data.length?`<ul class="issues-list">${data.map(message=>`<li>${esc(message)}</li>`).join('')}</ul>`:'<p>Aucune liaison cassée détectée.</p>';
 else{
  const state=describeTestState(project,data);
  $('#state-content').innerHTML=(state.variables.length?`<table class="test-data-table"><thead><tr><th>Donnée</th><th>Valeur pendant le test</th></tr></thead><tbody>${state.variables.map(v=>`<tr><th>${esc(v.label)}</th><td>${presentData(v.value,v.fields)}</td></tr>`).join('')}</tbody></table>`:'<p>Cette application ne contient pas encore de données.</p>')+(state.actions.length?`<h3>Dernières actions</h3><ol class="action-trace">${state.actions.map(a=>`<li><strong>${esc(a.label)}</strong>${a.variable?' · '+esc(a.variable):''}${a.branch?' · '+esc(a.branch):''}<small>${esc(a.screen)}</small></li>`).join('')}</ol>`:'')+`<details class="advanced"><summary>Vue technique</summary><pre>${esc(JSON.stringify(data,(_,value)=>typeof value==='string'&&value.startsWith('data:image/')?'[Image importée]':value,2))}</pre></details>`;
 }
 $('#state-dialog').showModal();
}
$('#test-state').onclick=()=>showState('Données pendant le test',lastState);$('#issues-button').onclick=()=>showState('Liaisons à vérifier',issues());
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#backup').onclick=()=>download(JSON.stringify(project,null,2),'application/json',(project.name||'project')+'.json');$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>30*1024*1024)throw Error('Ce fichier est trop volumineux.');const next=JSON.parse(await file.text());if(!validateProject(next))throw Error('Choisis un projet JSON de cet éditeur.');const imported=importedProjectCopy(localStorage,project,next);if(activateProject(imported,{undoable:true})&&imported.id!==next.id)$('#save-status').textContent='Projet importé comme nouvelle copie.';}catch(error){$('#save-status').textContent=error instanceof SyntaxError?'Ce fichier ne contient pas un projet JSON valide.':error.message;}finally{event.target.value='';}};
$('#export-app').onclick=async()=>{const button=$('#export-app');button.disabled=true;try{const output=structuredClone(project),images=new Map();const collect=obj=>{if(!obj||typeof obj!=='object')return;for(const value of Object.values(obj))if(typeof value==='string'&&/^assets\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(value))images.set(value,null);else if(value&&typeof value==='object')collect(value);};collect(output);await Promise.all([...images.keys()].map(async url=>{const response=await fetch(url);if(!response.ok)throw Error('Image introuvable : '+url);const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;response.arrayBuffer().then(buffer=>r.readAsDataURL(new Blob([buffer],{type:url.endsWith('.png')?'image/png':url.endsWith('.webp')?'image/webp':'image/jpeg'}))).catch(reject);});images.set(url,data);}));const replace=obj=>{for(const [k,v]of Object.entries(obj))if(typeof v==='string'&&images.has(v))obj[k]=images.get(v);else if(v&&typeof v==='object')replace(v);};replace(output);const json=JSON.stringify(output).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'"><title>${esc(output.name)}</title><style>${playerCSS}body{margin:0;background:#eee4f3;display:grid;place-items:center;min-height:100vh}.app-player{width:min(100vw,420px);height:100dvh;max-height:1000px;box-shadow:0 0 30px #29173f20}</style></head><body><main id="application" class="app-player"></main><script>const renderAppIcon=(${renderAppIcon.toString()});const createLocalCamera=(${createLocalCamera.toString()});const createAppTimers=(${createAppTimers.toString()});(${createPlayer.toString()})(document.querySelector('#application'),${json},{persist:true});</script></body></html>`;download(html,'text/html',(project.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-')||'application')+'.html');$('#save-status').textContent='Application HTML exportée, images incluses.';}catch(error){$('#save-status').textContent='Export : '+error.message;}finally{button.disabled=false;}};
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
flowUI=installFlowUI({getProject:()=>project,commit,finishStarter:()=>{project.starter.complete=true;save();renderAll();},openActions:(id,event)=>{selectNode(id);eventName=event||'click';inspectorTab='actions';renderInspector();},openScreen:id=>{screenId=id;selectedId=selectedVariable=null;mode='design';renderAll();}});
renderAll();save();if(loadMessage)$('#save-status').textContent=loadMessage;
