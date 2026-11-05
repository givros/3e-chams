import {createAppTimers} from './studio-timers.js';
import {createLocalCamera} from './studio-camera.js';
import {renderAppIcon} from './studio-icons.js';
// Shared by the editor preview and the exported standalone application.
export function createPlayer(root,project,options={}){
 let p=structuredClone(project),screen=p.home,state={},notice='',design=!!options.design,selected=options.selected||'',log=[];
 const quizPositions=new Map(),quizLocked=new Set();let focusQuizStep=false,activeQuizPairs=[];
 const events=new AbortController(),listen=(type,handler,options={})=>root.addEventListener(type,handler,{...(typeof options==='boolean'?{capture:options}:options),signal:events.signal});
 let appearance=p.theme,disposed=false;const camera=createLocalCamera();
 const timers=createAppTimers({onTick:(id,seconds,running)=>{if(disposed||design)return;const node=find(id);if(!node)return;try{write(node.props.variable,seconds);paintTimer(id,seconds,running);refreshTimedDisplays();persist();}catch(error){showNotice(error.message);}},onFinish:id=>{if(disposed||design)return;const node=find(id);if(!node||!root.querySelector(`[data-timer="${id}"]`))return;try{run(node.events.finish||[],{node,value:0});persist();render();}catch(error){showNotice(error.message);render();}}});
 function timerText(seconds){const value=Math.max(0,Math.ceil(Number(seconds)||0)),hours=Math.floor(value/3600),minutes=Math.floor(value%3600/60),rest=value%60;return (hours?String(hours).padStart(2,'0')+':':'')+String(minutes).padStart(2,'0')+':'+String(rest).padStart(2,'0');}
 function paintTimer(id,seconds,running){const box=root.querySelector(`[data-timer="${id}"]`);if(!box)return;const output=box.querySelector('output');output.textContent=timerText(seconds);output.classList.toggle('rt-timer-long',seconds>=3600);box.querySelector('[data-timer-start]').disabled=running;box.querySelector('[data-timer-start]').textContent=seconds===0?'Relancer':running?'En cours…':timers.snapshot(id)?.started?'Reprendre':'Démarrer';box.querySelector('[data-timer-pause]').disabled=!running;}
 function refreshTimedDisplays(){for(const element of root.querySelectorAll('[data-text-node]')){const n=find(element.dataset.textNode);if(n)element.textContent=template(n.props.text)+(n.props.textVariable?formatted(read(n.props.textVariable),n.props.textFormat)+(n.props.textSuffix||''):'');}for(const element of root.querySelectorAll('[data-progress-node]')){const n=find(element.dataset.progressNode);if(!n)continue;const max=Math.max(1,numeric(n.props.max,100)),value=Math.min(max,Math.max(0,numeric(read(n.props.variable))));element.querySelector('progress').value=value;element.querySelector('span').textContent=Math.round(value/max*100)+' %';}}
 function configureTimers(){const definitions=[...root.querySelectorAll('[data-timer]')].map(box=>find(box.dataset.timer)).filter(n=>p.variables.some(v=>v.name===n?.props.variable&&v.type==='number')).map(n=>({id:n.id,duration:n.props.duration,autoStart:restoredTimers.has(n.id)?false:!!n.props.autoStart,initialStarted:!!restoredTimers.get(n.id)?.started,initialSeconds:read(n.props.variable)}));timers.configure(definitions,!design&&!disposed);}
 const photoKey=name=>'studio-photo-'+p.id+'-'+name;
 function clearPhotos(){const visit=nodes=>{for(const n of nodes){if(n.type==='camera')try{localStorage.removeItem(photoKey(n.props.variable));}catch{}visit(n.children||[]);}};for(const s of p.screens)visit(s.nodes);}
 function photoCallbacks(n){const id=p.id,owner=screen;return {save:src=>{if(disposed||design||p.id!==id||screen!==owner||find(n.id)?.props.variable!==n.props.variable)return;try{write(n.props.variable,src);let saved=true;try{localStorage.setItem(photoKey(n.props.variable),src);}catch{saved=false;}run(n.events.change,{node:n,value:src});showNotice(saved?'Photo enregistrée sur cet appareil.':'Photo prise, mais l’enregistrement local est indisponible. Télécharge-la pour la garder.',saved);persist();render();}catch(e){showNotice(e.message);render();}},error:message=>{if(!disposed&&p.id===id&&screen===owner){showNotice(message);render();}}};}

 let trail=[],pendingScroll=null,drawerOpen=false,pendingFocus=null,noticeTimer=null,scrollSaveTimer=null;const restoredTimers=new Map();const disclosures=new Map();
 function showNotice(message,transient=false){clearTimeout(noticeTimer);notice=String(message??'');if(transient&&notice){const expected=notice;noticeTimer=setTimeout(()=>{if(root.isConnected&&notice===expected){notice='';root.querySelector('.rt-notice')?.remove();persist();}},Math.min(12000,Math.max(4000,notice.length*45)));}}
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=v=>v===undefined?null:structuredClone(v),money=n=>(Number.isFinite(Number(n))?Number(n):0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 const numeric=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
 const contrastText=color=>{const c=color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4),l=c[0]*.2126+c[1]*.7152+c[2]*.0722;return (l+.05)/.05>=4.5?'#000000':'#ffffff';};
 const productKey=(item,props)=>{if(item.id!==undefined)return String(item.id);const source=JSON.stringify([typeof item==='object'?item[props.nameField||'name']:String(item),item[props.priceField||'price'],item[props.imageField||'image']]);let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);return 'item_'+(hash>>>0).toString(36);};
 const cartRows=name=>{const list=read(name);return Array.isArray(list)?list.map((item,index)=>({item,index})).filter(({item})=>item&&typeof item==='object'&&!Array.isArray(item)):[];};
 const cartTotal=name=>cartRows(name).reduce((sum,{item})=>sum+numeric(item.price)*numeric(item.quantity),0);
 const safeImage=src=>typeof src==='string'&&(/^(data:image\/(png|jpeg|webp|gif);base64,)/.test(src)||/^assets\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(src))?src:'';
 const safePath=(obj,path)=>{for(const key of String(path).split('.')){if(['__proto__','constructor','prototype'].includes(key))return '';obj=obj?.[key];}return obj;};
 function read(name,stack=[]){if(stack.includes(name))return 0;const v=p.variables.find(v=>v.name===name);return v?.type==='computed'?value(v.formula||{}, {},[...stack,name]):Object.hasOwn(state,name)?state[name]:undefined;}
 function value(v,context={},stack=[]){if(!v)return '';if(v.kind==='literal')return v.value;if(v.kind==='variable')return read(v.name,stack);if(v.kind==='input')return context.value??'';if(v.kind==='item')return v.field?safePath(context.item,v.field):context.item;if(v.kind==='length'){const list=read(v.name,stack);return Array.isArray(list)||typeof list==='string'?list.length:0;}if(v.kind==='cartTotal'){const list=read(v.name,stack);return Array.isArray(list)?list.reduce((sum,item)=>sum+numeric(item?.price)*numeric(item?.quantity),0):0;}if(v.kind==='math'){const a=numeric(value(v.a,context,stack)),b=numeric(value(v.b,context,stack));return numeric(v.op==='subtract'?a-b:v.op==='multiply'?a*b:v.op==='divide'?(b?a/b:0):a+b);}return '';}
 function template(text,context={}){return String(text??'').replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_,path)=>{if(path==='index')return context.index??'';if(path==='item')return typeof context.item==='object'?context.item?.name??JSON.stringify(context.item):context.item??'';if(path.startsWith('item.'))return typeof context.item==='string'&&path==='item.name'?context.item:safePath(context.item,path.slice(5))??'';const [name,...rest]=path.split('.');const result=rest.length?safePath(read(name),rest.join('.')):read(name);return typeof result==='object'?JSON.stringify(result):result??'';});}
 function formatted(data,format){if(format==='money'&&typeof data==='number')return money(data);if(format==='percent'&&typeof data==='number')return data+' %';if(format==='count')return Array.isArray(data)||typeof data==='string'?data.length:0;if(typeof data==='boolean')return data?'Oui':'Non';if(Array.isArray(data))return data.length+' élément'+(data.length>1?'s':'');return data??'';}
 function booleanValue(value){if(typeof value==='boolean')return value;if(['true','vrai','oui','1'].includes(String(value).trim().toLowerCase()))return true;if(['false','faux','non','0',''].includes(String(value??'').trim().toLowerCase()))return false;throw Error('Choisis Oui ou Non pour cette donnée.');}
 function condition(c,context){
  const a=value(c.left,context),b=value(c.right,context),date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?Date.parse(v+'T00:00:00Z'):NaN;
  const da=date(a),db=date(b),left=Number.isFinite(da)&&Number.isFinite(db)?da:Number(a),right=Number.isFinite(da)&&Number.isFinite(db)?db:Number(b);
  switch(c.op){case'eq':return typeof a==='boolean'||typeof b==='boolean'?booleanValue(a)===booleanValue(b):String(a)===String(b);case'neq':return typeof a==='boolean'||typeof b==='boolean'?booleanValue(a)!==booleanValue(b):String(a)!==String(b);case'gt':return left>right;case'gte':return left>=right;case'lt':return left<right;case'lte':return left<=right;case'contains':return String(a).includes(String(b));case'empty':return a===null||a===undefined||a===''||Array.isArray(a)&&a.length===0;default:return false;}
 }
 function write(name,next){const v=p.variables.find(v=>v.name===name);if(!v||v.type==='computed')throw Error('Variable introuvable : '+name);if(v.type==='number'){next=Number(next);if(!Number.isFinite(next))throw Error('La valeur doit être un nombre.');}if(v.type==='text')next=String(next??'');if(v.type==='boolean')next=booleanValue(next);if(v.type==='list'&&!Array.isArray(next))throw Error('La valeur doit être une liste.');state[name]=clone(next);}
 function navigate(next){
  if(!p.screens.some(s=>s.id===next))throw Error('L’écran de destination a été supprimé.');
  drawerOpen=false;if(next===screen)return;
  trail.push({screen,scroll:root.querySelector('.rt-screen')?.scrollTop||0});if(trail.length>60)trail.shift();screen=next;pendingScroll=0;
 }
 function back(){drawerOpen=false;let previous;while(trail.length){const candidate=trail.pop();if(candidate.screen!==screen&&p.screens.some(s=>s.id===candidate.screen)){previous=candidate;break;}}screen=previous?.screen||p.home;pendingScroll=previous?.scroll||0;}
 function validateFields(scope){
  const owner=scope?find(scope):p.screens.find(s=>s.id===screen);if(!owner||scope&&owner.type!=='form')throw Error('Le formulaire à vérifier a été supprimé.');
  const visit=(list,ancestors=[])=>{for(const n of list){const x=n.props;if(x.visibleVariable&&!read(x.visibleVariable))continue;
   if(['input','number','textarea','select','toggle','date','rating'].includes(n.type)){
    const val=read(x.variable),empty=val===null||val===undefined||String(val).trim()===''||n.type==='toggle'&&!val||n.type==='rating'&&numeric(val)<=0;let error='';
    if(x.required&&empty)error='Renseigne « '+(x.label||n.name)+' ».';
    else if(!empty){
     if(x.inputType==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val)))error='Vérifie l’adresse e-mail.';
     if(Number(x.minLength)>0&&String(val).length<Number(x.minLength))error='« '+(x.label||n.name)+' » doit contenir au moins '+Number(x.minLength)+' caractères.';
     if(n.type==='number'&&(x.min!==undefined&&numeric(val)<Number(x.min)||x.max!==undefined&&numeric(val)>Number(x.max)))error='« '+(x.label||n.name)+' » est en dehors des valeurs autorisées.';
     if(n.type==='date'){const date=new Date(String(val)+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==val||x.minDate&&val<x.minDate||x.maxDate&&val>x.maxDate)error='Vérifie la date choisie.';}
    }
    if(error){for(const parent of ancestors)if(parent.type==='accordion')disclosures.set(parent.id,true);pendingFocus=n.id;throw Error(error);}
   }visit(n.children||[],[...ancestors,n]);
  }};visit(owner.nodes||owner.children||[]);
 }
 function run(actions,context={},depth=0){if(depth>30)throw Error('Les conditions sont trop imbriquées.');for(const a of actions||[]){
  if(a.type==='set')write(a.variable,value(a.value,context));
  if(a.type==='increment')write(a.variable,Number(read(a.variable)||0)+Number(a.delta||0));
  if(a.type==='append'){const list=read(a.variable);if(!Array.isArray(list))throw Error('Choisis une liste.');const entry=value(a.value,context);write(a.variable,[...list,clone(entry)]);}
  if(a.type==='remove'){const list=read(a.variable);if(!Array.isArray(list))throw Error('Choisis une liste.');write(a.variable,list.filter((_,i)=>i!==context.index));}
  if(a.type==='navigate')navigate(a.screen);
  if(a.type==='back')back();
  if(a.type==='validate')validateFields(a.form);
  if(a.type==='toast')showNotice(template(value(a.value,context),context),true);
  if(a.type==='if'){const matches=(a.conditions||[]).map(c=>condition(c,context)),result=!!(matches.length&&(a.join==='or'?matches.some(Boolean):matches.every(Boolean)));log.push({action:'if',result,screen});run(result?a.then:a.else,context,depth+1);}
  if(a.type==='cartAdd'){
   const list=read(a.variable);if(!Array.isArray(list)||!context.item)throw Error('Cette action utilise un article de catalogue et une liste panier.');
   const item=context.item,props=context.node?.props||{},source=props.identityVariable||props.variable||context.node?.id||'item',id=source+':'+productKey(item,props),qty=Math.max(1,numeric(a.quantity,1));
   const name=item[props.nameField||'name']??item.name??String(item),price=numeric(item[props.priceField||'price']),image=item[props.imageField||'image']||'';
   const foundIndex=list.findIndex(x=>x&&(x.id===id||((String(x.id).startsWith(source+':')&&/^\d+$/.test(String(x.id).slice(source.length+1))||/^\d+$/.test(String(x.id)))&&x.name===name&&numeric(x.price)===price&&(x.image||'')===image)));
   const next=clone(list);if(foundIndex>=0){next[foundIndex].id=id;next[foundIndex].quantity=numeric(next[foundIndex].quantity)+qty;}else next.push({id,name,price,image,quantity:qty});write(a.variable,next);
  }
  if(a.type==='reset'){quizPositions.clear();quizLocked.clear();timers.clear();restoredTimers.clear();clearPhotos();camera.stop();for(const v of p.variables)state[v.name]=clone(v.initial);}
  if(a.type!=='if')log.push({action:a.type,variable:a.variable||'',screen});if(log.length>50)log.shift();
 }}
 function initial(restore=true){quizPositions.clear();quizLocked.clear();state=Object.fromEntries(p.variables.map(v=>[v.name,clone(v.initial)]));if(restore&&options.persist){try{const saved=JSON.parse(localStorage.getItem('studio-app-'+p.id));if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const v of p.variables)if(Object.hasOwn(saved,v.name)&&v.type!=='computed'&&(v.type==='list'?Array.isArray(saved[v.name]):v.type==='number'?typeof saved[v.name]==='number'&&Number.isFinite(saved[v.name]):typeof saved[v.name]===typeof v.initial))state[v.name]=clone(saved[v.name]);}catch{}}}
 function restorePhotos(){if(design)return;const visit=nodes=>{for(const n of nodes){if(n.type==='camera')try{const src=localStorage.getItem(photoKey(n.props.variable));if(safeImage(src))write(n.props.variable,src);}catch{}visit(n.children||[]);}};for(const s of p.screens)visit(s.nodes);}
 function stateSnapshot(){const output=clone(state);for(const v of p.variables)if(v.type==='computed')output[v.name]=clone(read(v.name));return output;}
 function getSnapshot(){const clocks=[];const visit=nodes=>{for(const n of nodes){if(n.type==='timer'){const value=timers.snapshot(n.id);if(value)clocks.push({id:n.id,...value});}visit(n.children||[]);}};for(const s of p.screens)visit(s.nodes);return {projectId:p.id,screen,state:stateSnapshot(),trail:clone(trail),scroll:pendingScroll??root.querySelector('.rt-screen')?.scrollTop??0,disclosures:[...disclosures],quizPositions:[...quizPositions],quizLocked:[...quizLocked],timers:clocks};}
 function restoreSnapshot(saved){
  if(!saved||saved.projectId!==p.id)return;const values=saved.state;
  if(values&&typeof values==='object'&&!Array.isArray(values))for(const v of p.variables){const value=values[v.name];if(!Object.hasOwn(values,v.name)||v.type==='computed')continue;if(v.type==='list'?Array.isArray(value):v.type==='number'?Number.isFinite(value):v.type==='boolean'?typeof value==='boolean':typeof value==='string')state[v.name]=clone(value);}
  if(p.screens.some(s=>s.id===saved.screen))screen=saved.screen;
  const scroll=value=>Number.isFinite(value)?Math.min(1000000,Math.max(0,value)):0;
  trail=Array.isArray(saved.trail)?saved.trail.filter(item=>item&&p.screens.some(s=>s.id===item.screen)).slice(-60).map(item=>({screen:item.screen,scroll:scroll(item.scroll)})):[];pendingScroll=scroll(saved.scroll);
  quizPositions.clear();quizLocked.clear();
  if(Array.isArray(saved.quizLocked))for(const id of saved.quizLocked.slice(0,1000))if(find(id)?.type==='select')quizLocked.add(id);
  if(Array.isArray(saved.quizPositions))for(const item of saved.quizPositions.slice(0,500)){
   if(Array.isArray(item)&&p.screens.some(s=>s.id===item[0])&&Number.isInteger(item[1])&&item[1]>=0)quizPositions.set(item[0],item[1]);
  }
  disclosures.clear();if(Array.isArray(saved.disclosures))for(const item of saved.disclosures.slice(0,500))if(Array.isArray(item)&&find(item[0])?.type==='accordion'&&typeof item[1]==='boolean')disclosures.set(item[0],item[1]);
  timers.clear();restoredTimers.clear();if(Array.isArray(saved.timers))for(const clock of saved.timers.slice(0,500))if(find(clock?.id)?.type==='timer')restoredTimers.set(clock.id,{started:clock.started===true});
 }
 function persist(extra={}){const snapshot=getSnapshot();if(options.persist){let stateSaved=true,navigationSaved=true;try{localStorage.setItem('studio-app-'+p.id,JSON.stringify(snapshot.state));}catch{stateSaved=false;}try{const {state:_,...navigation}=snapshot;localStorage.setItem('studio-app-nav-'+p.id,JSON.stringify(navigation));}catch{navigationSaved=false;}if(!stateSaved||!navigationSaved){showNotice(stateSaved?'Données enregistrées, mais reprise de l’écran indisponible.':'Enregistrement local indisponible. Garde cette page ouverte pour conserver tes saisies.');let element=root.querySelector('.rt-notice');if(!element){element=document.createElement('div');element.className='rt-notice';element.setAttribute('role','status');root.append(element);}element.innerHTML=esc(notice)+'<button type="button" data-dismiss aria-label="Fermer le message">✕</button>';}}options.onChange?.({screen,state:snapshot.state,log:clone(log),notice,snapshot,...extra});}

 function nodes(list){return list.map(node=>renderNode(node)).join('');}
 function renderNode(n,context={}){
  const x=n.props,s=n.style||{},visible=x.visibleVariable?!!read(x.visibleVariable):true;if(!visible)return '';
  const id=esc(n.id),text=esc(template(x.text,context)+(x.textVariable?formatted(read(x.textVariable),x.textFormat)+(x.textSuffix||''):'')),tag=n.type==='heading'?'h2':'div';let body='';
  if(n.type==='heading'||n.type==='text')body=`<${tag} class="rt-copy" data-text-node="${id}">${text}</${tag}>`;
  if(n.type==='badge')body=`<span class="rt-badge" data-text-node="${id}">${text}</span>`;
  if(n.type==='image'){const src=safeImage(x.srcVariable?read(x.srcVariable):template(x.src,context));body=src?`<img class="rt-image" src="${esc(src)}" alt="${esc(x.alt||'')}" style="height:${Number(x.height)||180}px;object-fit:${x.fit==='contain'?'contain':'cover'}">`:'<div class="rt-image-placeholder">Image</div>';}
  if(n.type==='camera'){const photo=safeImage(read(x.variable)),facing=x.facing==='user'?'user':'environment';body=`<div class="rt-camera" data-camera-box="${id}"><strong>${esc(x.label||'Ma photo')}</strong><div class="rt-camera-stage"><video playsinline muted hidden aria-label="Aperçu de la caméra"></video>${photo?`<img src="${esc(photo)}" alt="${esc(x.label||'Photo prise')}">`:'<div class="rt-camera-empty">'+renderAppIcon('camera',48)+'</div>'}</div><div class="rt-camera-controls"><button type="button" class="rt-button" data-camera-open="${id}">Ouvrir la caméra</button><button type="button" class="rt-button" data-camera-capture="${id}" hidden>Prendre la photo</button><button type="button" class="rt-camera-secondary" data-camera-stop hidden>Fermer la caméra</button><label class="rt-camera-secondary">Choisir une photo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="${facing}" data-camera-file="${id}" hidden></label>${photo?`<button type="button" class="rt-camera-secondary" data-camera-download="${id}">Télécharger la photo</button><button type="button" class="rt-camera-secondary" data-camera-delete="${id}">Effacer la photo</button>`:''}</div><small>Photo conservée sur cet appareil.</small></div>`;}
  if(n.type==='icon'){const graphic=renderAppIcon(x.icon,x.iconSize),clickable=!!n.events.click?.length;body=clickable?`<button type="button" class="rt-icon-button" data-event="click" data-node="${id}" aria-label="${esc(x.label||n.name)}">${graphic}</button>`:`<span class="rt-icon-standalone" role="img" aria-label="${esc(x.label||n.name)}">${graphic}</span>`;}
  const quizPair=n.type==='button'?activeQuizPairs.find(pair=>pair.button.id===n.id):null;
  if(quizPair&&quizLocked.has(quizPair.answer.id))return '';
  if(n.type==='button'||n.type==='back')body=`<button type="button" class="rt-button rt-custom-button" data-event="click" data-node="${id}" ${quizPair&&!hasQuizAnswer(quizPair)?'disabled':''} ${x.iconOnly?`aria-label="${text}"`:''}><span class="rt-button-content">${x.iconPosition==='right'?'':renderAppIcon(x.icon)}${x.iconOnly?'':text}${x.iconPosition==='right'?renderAppIcon(x.icon):''}</span></button>`;
  if(['input','number','textarea','select','toggle','search','date'].includes(n.type)){
   const val=read(x.variable)??'',input=`data-bind="${esc(x.variable||'')}" data-node="${id}" data-input="${id}" ${x.required?'aria-required="true"':''}`;
   if(n.type==='textarea')body=`<label class="rt-label">${esc(x.label||'')}<textarea ${input} placeholder="${esc(x.placeholder||'')}">${esc(val)}</textarea></label>`;
   else if(n.type==='select')body=`<label class="rt-label">${esc(x.label||'')}<select ${input} ${!design&&quizLocked.has(n.id)?'disabled':''}><option value="" ${val===''?'selected':''}>Choisir…</option>${String(x.options||'').split('\n').map(option=>`<option ${String(val)===option?'selected':''}>${esc(option)}</option>`).join('')}</select></label>`;
   else if(n.type==='toggle')body=`<label class="rt-switch"><span>${esc(x.label||'')}</span><input type="checkbox" ${input} ${val?'checked':''}></label>`;
   else body=`<label class="rt-label">${esc(x.label||'')}${x.required?' *':''}<input type="${['number','date','search'].includes(n.type)?n.type:['email','tel','url'].includes(x.inputType)?x.inputType:'text'}" ${input} value="${esc(val)}" ${n.type==='date'?`${x.minDate?`min="${esc(x.minDate)}"`:''} ${x.maxDate?`max="${esc(x.maxDate)}"`:''}`:''} placeholder="${esc(x.placeholder||'')}"></label>`;
  }
  if(n.type==='range'){
   const min=numeric(x.min),step=Math.max(.01,numeric(x.step,1)),max=Math.max(min+step,numeric(x.max,100)),val=Math.min(max,Math.max(min,numeric(read(x.variable),min)));
   body=`<label class="rt-label rt-range-label">${esc(x.label||'Valeur')} <output data-range-output="${id}">${esc(val)}</output><input type="range" data-bind="${esc(x.variable)}" data-node="${id}" data-input="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  }
  if(n.type==='rating'){
   const max=Math.min(10,Math.max(1,Math.floor(numeric(x.max,5)))),val=numeric(read(x.variable));
   body=`<div class="rt-rating" role="group" aria-label="${esc(x.label||'Note')}"><span>${esc(x.label||'Note')}</span><div>${Array.from({length:max},(_,i)=>`<button type="button" data-rate="${i+1}" data-node="${id}" aria-label="${i+1} étoile${i?'s':''} sur ${max}" aria-pressed="${val===i+1}" class="${i<val?'active':''}">★</button>`).join('')}</div></div>`;
  }
  if(n.type==='timer'){const snapshot=design?null:timers.snapshot(n.id),seconds=snapshot?.seconds??Math.min(86400,Math.max(1,Number(x.duration)||60)),running=!!snapshot?.running,valid=p.variables.some(v=>v.name===x.variable&&v.type==='number');body=`<div class="rt-timer" data-timer="${id}"><strong>${esc(x.label||'Temps restant')}</strong><output class="rt-timer-value ${seconds>=3600?'rt-timer-long':''}" aria-label="Temps restant">${timerText(seconds)}</output><div class="rt-timer-controls"><button type="button" class="rt-button" data-timer-start="${id}" ${running||!valid?'disabled':''}>${seconds===0?'Relancer':running?'En cours…':snapshot?.started?'Reprendre':'Démarrer'}</button><button type="button" class="rt-button" data-timer-pause="${id}" ${!running?'disabled':''}>Pause</button><button type="button" class="rt-timer-reset" data-timer-reset="${id}" ${!valid?'disabled':''}>Recommencer</button></div></div>`;}
  if(n.type==='progress'){
   const max=Math.max(1,numeric(x.max,100)),val=Math.min(max,Math.max(0,numeric(read(x.variable)))),percent=Math.round(val/max*100);
   body=`<label class="rt-label rt-progress-label" data-progress-node="${id}">${esc(x.label||'Progression')}<span>${percent} %</span><progress max="${max}" value="${val}">${percent} %</progress></label>`;
  }
  if(n.type==='divider')body='<hr class="rt-divider">';
  if(n.type==='spacer')body=`<div style="height:${Math.max(0,numeric(x.height,30))}px"></div>`;
  if(n.type==='container'){
   const count=Math.min(4,Math.max(2,numeric(x.columns,2))),weights=String(x.columnWidths||'').split(',');
   const tracks=Array.from({length:count},(_,i)=>`minmax(0,${Math.max(.25,Math.min(4,numeric(weights[i],1)||1))}fr)`).join(' ');
   body=`<div class="rt-container" data-player-drop="${id}" style="${x.direction==='grid'?`display:grid;grid-template-columns:${tracks};`:`flex-direction:${x.direction==='row'?'row':'column'};`}gap:${Number(s.gap)||0}px">${nodes(n.children||[])}${design&&!(n.children||[]).length?'<div class="rt-empty">Déposer ici</div>':''}</div>`;
  }
  if(n.type==='form')body=`<div class="rt-form" role="group" aria-label="${esc(x.title||'Formulaire')}" data-player-drop="${id}">${x.title?`<h3>${esc(x.title)}</h3>`:''}${nodes(n.children||[])}${design&&!(n.children||[]).length?'<div class="rt-empty">Déposer un champ ici</div>':''}</div>`;
  if(n.type==='accordion')body=`<details class="rt-accordion" data-disclosure="${id}" ${(design||(disclosures.has(n.id)?disclosures.get(n.id):x.open))?'open':''}><summary>${esc(x.title||'En savoir plus')}</summary><div data-player-drop="${id}" class="rt-accordion-content">${nodes(n.children||[])}${design&&!(n.children||[]).length?'<div class="rt-empty">Déposer ici</div>':''}</div></details>`;
  if(n.type==='productDetail'){
   const list=read(x.variable),index=Math.max(0,Math.floor(numeric(x.itemIndex))),item=Array.isArray(list)?list[index]:null;
   if(item&&typeof item==='object'){
    const image=safeImage(item[x.imageField||'image']),description=item[x.descriptionField===undefined?'description':x.descriptionField];
    body=`<article class="rt-product-detail">${image?`<img src="${esc(image)}" alt="${esc(item[x.nameField||'name']||'')}" class="rt-detail-image">`:''}<h3>${esc(item[x.nameField||'name'])}</h3>${description?`<p>${esc(description)}</p>`:''}<strong class="rt-detail-price">${money(item[x.priceField||'price'])}</strong>${x.itemButton?`<button type="button" class="rt-button" data-event="item" data-node="${id}" data-index="${index}">${esc(x.itemButton)}</button>`:''}</article>`;
   }else body=`<div class="rt-list-empty">${esc(x.empty||'Sélectionne un article.')}</div>`;
  }
  if(n.type==='list'||n.type==='products'){
   const source=read(x.variable)||[],normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),query=normalize(read(x.searchVariable)||'').trim();
   let items=Array.isArray(source)?source.map((item,index)=>({item,index})):[];
   const name=item=>n.type==='products'?item?.[x.nameField||'name']:template(x.itemText||'{{item}}',{item});
   if(query)items=items.filter(({item})=>normalize(name(item)).includes(query));
   if(['name','priceAsc','priceDesc'].includes(x.sortBy))items.sort((a,b)=>x.sortBy==='name'?String(name(a.item)||'').localeCompare(String(name(b.item)||''),'fr',{sensitivity:'base',numeric:true}):(numeric(a.item?.[x.priceField||'price'])-numeric(b.item?.[x.priceField||'price']))*(x.sortBy==='priceDesc'?-1:1));
   body=items.length?`<div class="rt-list ${n.type==='products'?'rt-products':''}">${items.map(({item,index})=>{
    const ctx={item,index,node:n},image=n.type==='products'?safeImage(item?.[x.imageField||'image']):'',name=n.type==='products'?item?.[x.nameField||'name']:template(x.itemText||'{{item}}',ctx);
    const clickable=!x.itemButton&&n.events.item?.length;
    return `<div class="rt-list-item" ${clickable?`data-event="item" data-node="${id}" data-index="${index}" role="button" tabindex="0"`:''}>${image?`<img src="${esc(image)}" alt="">`:''}<div class="rt-item-copy">${esc(name??'')} ${n.type==='products'?`<b>${money(item?.[x.priceField||'price'])}</b>`:''}</div>${x.itemButton?`<button type="button" class="rt-button rt-small" data-event="item" data-node="${id}" data-index="${index}">${esc(x.itemButton)}</button>`:''}${n.type==='list'&&x.removable?`<button type="button" class="rt-remove" data-remove="${esc(x.variable)}" data-index="${index}" aria-label="Supprimer cet élément">✕</button>`:''}</div>`;
   }).join('')}</div>`:`<div class="rt-list-empty">${esc(query?'Aucun résultat.':x.empty||'Liste vide')}</div>`;
  }
  if(n.type==='cart'){
   const items=cartRows(x.variable),subtotal=cartTotal(x.variable),fee=subtotal?(Number(x.freeAt)>0&&subtotal>=Number(x.freeAt)?0:Math.max(0,numeric(x.delivery))):0,reduction=Math.max(0,numeric(read(x.discountVariable)));
   body=(items.length?items.map(({item,index})=>`<div class="rt-cart-row"><span>${esc(item.name)}<small>${money(item.price)}</small></span><div><button type="button" data-cart="-1" data-list="${esc(x.variable)}" data-index="${index}" aria-label="Retirer ${esc(item.name)}">−</button><b>${esc(item.quantity)}</b><button type="button" data-cart="1" data-list="${esc(x.variable)}" data-index="${index}" aria-label="Ajouter ${esc(item.name)}">+</button></div><strong>${money(numeric(item.price)*numeric(item.quantity))}</strong></div>`).join(''):`<div class="rt-list-empty">${esc(x.empty||'Panier vide')}</div>`)+`<div class="rt-receipt"><div>Articles <b>${money(subtotal)}</b></div><div>Livraison <b>${money(fee)}</b></div>${reduction?`<div>Réduction <b>− ${money(reduction)}</b></div>`:''}<div class="rt-total">Total <b>${money(Math.max(0,subtotal+fee-reduction))}</b></div></div><button type="button" class="rt-button" data-event="click" data-node="${id}" ${!items.length?'disabled':''}>${esc(x.checkout||'Confirmer')}</button>`;
  }
  const customBackground=/^#[0-9a-f]{6}$/i.test(s.background||''),customColor=/^#[0-9a-f]{6}$/i.test(s.color||'');
  const ownBackground=customBackground?s.background:['button','back','badge'].includes(n.type)||x.presentation==='banner'?appearance.primary:null;
  const ownColor=customColor?s.color:ownBackground?contrastText(ownBackground):null;
  const fieldBackground=customBackground?s.background:'#ffffff',fieldColor=customColor?s.color:contrastText(fieldBackground);
  const style=`padding:${Math.max(0,Number(s.padding)||0)}px;text-align:${['left','center','right'].includes(s.align)?s.align:'left'};font-size:${Math.min(72,Math.max(8,Number(s.fontSize)||14))}px;width:${['100%','75%','50%','auto'].includes(s.width)?s.width:'100%'};border-radius:${Math.max(0,numeric(s.radius,appearance.radius))}px;--node-radius:${Math.max(0,numeric(s.radius,appearance.radius))}px;--field-background:${fieldBackground};--field-color:${fieldColor};${ownColor?'color:'+ownColor+';--node-color:'+ownColor+';':''}${ownBackground?'--node-background:'+ownBackground+';':''}${customBackground?'background:'+s.background+';':''}`;
  const marginX=Math.min(80,Math.max(0,numeric(s.marginX))),marginY=Math.min(100,Math.max(0,numeric(s.marginY))),border=Math.min(8,Math.max(0,numeric(s.borderWidth))),borderColor=/^#[0-9a-f]{6}$/i.test(s.borderColor||'')?s.borderColor:appearance.primary;
  const decoration=`margin:${marginY}px ${marginX}px;max-width:calc(100% - ${marginX*2}px);border:${border}px solid ${borderColor};box-shadow:${({soft:'0 4px 16px #0000001c',raised:'0 6px 0 #00000025'})[s.shadow]||'none'};`;
  return `<section data-player-node="${id}" ${['card','banner'].includes(x.presentation)?`data-presentation="${x.presentation}"`:''} ${design?`draggable="true" data-move-node="${id}"`:''} class="rt-node ${design?'rt-design':''} ${selected===n.id?'rt-selected':''}" style="${style}${decoration}">${design?`<span class="rt-drag-handle" draggable="true" data-move-node="${id}" aria-hidden="true">⠿</span>`:''}${body}</section>`;
 }
 function find(id){let result;const visit=list=>{for(const n of list){if(n.id===id)result=n;visit(n.children||[]);}};for(const s of p.screens)visit(s.nodes);return result;}
 function navigationHTML(current){
  const nav=p.navigation;if(!nav?.enabled)return {header:'',footer:'',drawer:''};
  const items=(nav.items||[]).map(id=>p.screens.find(s=>s.id===id)).filter(Boolean),disabled=design?'disabled':'';
  const itemHTML=s=>`<button type="button" data-nav-screen="${esc(s.id)}" class="${s.id===screen?'active':''}" ${s.id===screen?'aria-current="page"':''} ${disabled}><span aria-hidden="true">${renderAppIcon(String(s.menuIcon||'').replace(/^icon:/,''),20)||esc(s.menuIcon||'●')}</span><b>${esc(s.menuLabel||s.name)}</b></button>`;
  const icon=nav.headerIcon||(['drawer','both'].includes(nav.style)?'menu':'none'),target=icon==='settings'?nav.settingsScreen:nav.profileScreen,profile=p.screens.some(s=>s.id===target);
  const glyph=icon==='settings'?'<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3-1 3-3 1-2 4 2 2v3l3 2 1 3h6l1-3 3-2v-3l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></svg>':icon==='profile'?'<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="9" r="3"/><path d="M5.5 19c.8-3 3-4.5 6.5-4.5s5.7 1.5 6.5 4.5"/></svg>':'<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const control=icon==='none'?'':`<button type="button" class="${nav.showHeader===false?'rt-menu-floating':'rt-header-icon'}" ${['profile','settings'].includes(icon)?`data-nav-${icon} data-nav-screen="${esc(target||'')}" aria-label="${icon==='settings'?'Ouvrir les paramètres':'Ouvrir le profil'}" ${!profile?'disabled title="Choisis un écran dans les réglages du menu"':''}`:`data-nav-menu aria-label="Ouvrir le menu" aria-expanded="${drawerOpen}"`} ${disabled}>${glyph}</button>`;
  const header=nav.showHeader!==false?`<header class="rt-app-header" ${drawerOpen?'inert':''}>${nav.showBack!==false?`<button type="button" data-nav-back aria-label="Retour à l’écran précédent" ${disabled||(!trail.length&&screen===p.home?'disabled':'')}>←</button>`:'<span></span>'}<strong>${esc(current.name)}</strong>${control||'<span></span>'}</header>`:'';
  const footer=(['tabs','both'].includes(nav.style)?`<nav class="rt-tabs" aria-label="Menu de l’application" ${drawerOpen?'inert':''}>${items.map(itemHTML).join('')}</nav>`:'')+(nav.showHeader===false?control:'');
  const drawer=drawerOpen?`<div class="rt-menu-layer"><button type="button" class="rt-menu-shade" data-nav-close aria-label="Fermer le menu"></button><div class="rt-drawer" role="dialog" aria-modal="true" aria-label="Menu de l’application"><div class="rt-drawer-heading"><strong>${esc(p.name)}</strong><button type="button" data-nav-close aria-label="Fermer le menu">✕</button></div><nav>${items.map(itemHTML).join('')}</nav></div></div>`:'';
  return {header,footer,drawer};
 }
 function quizPairs(current){
  const selects=new Map(current.nodes.filter(n=>n.type==='select'&&n.props.variable).map(n=>[n.props.variable,n]));
  const feedback=new Set(current.nodes.filter(n=>n.type==='text').map(n=>n.props.textVariable));
  const pairs=[];
  for(const button of current.nodes){
   if(button.type!=='button'||button.props.quizScore)continue;
   for(const rule of button.events.click){
    const test=rule.conditions?.[0],success=rule.then?.[0],failure=rule.else?.[0],answer=selects.get(test?.left?.name);
    if(rule.type!=='if'||rule.conditions?.length!==1||test?.left?.kind!=='variable'||test.op!=='eq'||test.right?.kind!=='literal'
     ||!answer||success?.type!=='set'||failure?.type!=='set'||!success.variable||success.variable!==failure.variable
     ||!feedback.has(success.variable))continue;
    pairs.push({button,answer,result:success.variable});break;
   }
  }
  return pairs;
 }
 function hasQuizAnswer(pair){const value=read(pair.answer.props.variable);return !!value&&String(pair.answer.props.options||'').split(String.fromCharCode(10)).includes(value);}
 function lockQuizAnswer(pair){
  quizLocked.add(pair.answer.id);
  if(read(pair.result)==='Essaie encore.')write(pair.result,'Mauvaise réponse.');
 }
 function restartQuiz(){
  const current=p.screens.find(s=>s.id===screen);
  if(!activeQuizPairs.length)return;
  const values=new Set(current.nodes.filter(n=>n.props.quizScore).map(n=>n.props.quizScore));
  for(const {answer,result} of activeQuizPairs){
   values.add(answer.props.variable);values.add(result);quizLocked.delete(answer.id);
  }
  for(const name of values){
   const variable=p.variables.find(entry=>entry.name===name);
   if(variable)write(name,clone(variable.initial));
  }
  quizPositions.delete(screen);
  pendingScroll=0;showNotice('');
  render();persist();
  root.querySelector('[data-quiz-restart]')?.focus({preventScroll:true});
 }
 function quizPage(){
  const current=p.screens.find(s=>s.id===screen);
  if(design||!['steps','auto'].includes(current?.quizLayout))return null;
  const questions=current.nodes.filter(node=>node.type==='select'&&Number.isInteger(node.props.quizStep));
  if(questions.length<2)return null;
  const index=Math.min(quizPositions.get(screen)??0,questions.length-1);
  return {current,questions,index,last:index===questions.length-1,step:questions[index].props.quizStep};
 }
 function advanceQuiz(){
  const page=quizPage();
  if(!page||page.last||!quizLocked.has(page.questions[page.index].id))return;
  quizPositions.set(screen,page.index+1);
  pendingScroll=0;focusQuizStep=true;
 }
 function render(){
  camera.stop();
  const originalInput=root.contains(document.activeElement)&&document.activeElement?.dataset?.input?document.activeElement:null;
  const active=originalInput?.dataset?.input,position=originalInput?.selectionStart,end=originalInput?.selectionEnd,oldScroll=root.querySelector('.rt-screen')?.scrollTop||0;
  const current=p.screens.find(s=>s.id===screen)||p.screens[0];screen=current.id;activeQuizPairs=design?[]:quizPairs(current);
  appearance={...p.theme};const dark=!!read(p.theme.darkVariable);if(dark)Object.assign(appearance,{primary:'#b69aff',background:'#181521',text:'#f6f0ff'});
  const screenBackground=dark&&(!current.background||current.background===p.theme.background)?appearance.background:current.background||appearance.background;
  const channels=appearance.primary.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;root.style.setProperty('--app-on-primary',(luminance+.05)/.05>=4.5?'#000000':'#ffffff');
  root.style.setProperty('--app-primary',appearance.primary);root.style.setProperty('--app-background',screenBackground);root.style.setProperty('--app-text',dark&&screenBackground!==appearance.background?contrastText(screenBackground):appearance.text);root.style.setProperty('--app-radius',appearance.radius+'px');root.style.setProperty('--app-font',({rounded:'Trebuchet MS,Arial,sans-serif',simple:'Arial,sans-serif',serif:'Georgia,serif',mono:'Courier New,monospace',clear:'Verdana,sans-serif'})[appearance.font]||'Trebuchet MS,Arial,sans-serif');
  root.dataset.hasTabs=String(!!p.navigation?.enabled&&['tabs','both'].includes(p.navigation.style));
  const nav=navigationHTML(current),quiz=quizPage();
  const visibleNodes=quiz?current.nodes.filter(node=>node.props.quizScore?quiz.last:!Number.isInteger(node.props.quizStep)||node.props.quizStep===quiz.step):current.nodes;
  const quizRestart=options.quizRestart&&activeQuizPairs.length?'<div class="rt-quiz-restart"><button type="button" data-quiz-restart>↻ Recommencer le quiz</button></div>':'';
  const quizProgress=quiz?`<p class="rt-quiz-progress" tabindex="-1">Question ${quiz.index+1} sur ${quiz.questions.length}</p>`:'';
  const quizControls=quiz&&!quiz.last?`<div class="rt-quiz-controls"><button type="button" data-quiz-next ${quizLocked.has(quiz.questions[quiz.index].id)?'':'disabled'}>Suivante →</button></div>`:'';
  root.innerHTML=`<div class="rt-app-frame">${nav.header}<div class="rt-screen" data-player-drop="root" ${drawerOpen?'inert':''}>${quizRestart}${quizProgress}${nodes(visibleNodes)}${quizControls}${design&&!current.nodes.length?`<div class="rt-empty rt-root-empty">${current.quizTutorial?.step===-1?'Dépose le modèle Quiz ici':'Glisse un composant ici'}</div>`:''}</div>${nav.footer}${nav.drawer}</div>${notice?`<div class="rt-notice" role="status">${esc(notice)}<button type="button" data-dismiss aria-label="Fermer le message">✕</button></div>`:''}`;
  if(originalInput){
   const replacement=[...root.querySelectorAll('[data-input]')].find(el=>el.dataset.input===active);
   if(replacement&&replacement.tagName===originalInput.tagName&&replacement.type===originalInput.type){
    for(const attr of [...originalInput.attributes])if(!replacement.hasAttribute(attr.name))originalInput.removeAttribute(attr.name);
    for(const attr of replacement.attributes)originalInput.setAttribute(attr.name,attr.value);
    if(replacement.tagName==='SELECT')originalInput.innerHTML=replacement.innerHTML;
    if(originalInput.value!==replacement.value)originalInput.value=replacement.value;
    if(originalInput.type==='checkbox')originalInput.checked=replacement.checked;
    replacement.replaceWith(originalInput);
   }
  }
  root.querySelector('.rt-screen').scrollTop=pendingScroll??oldScroll;pendingScroll=null;
  if(pendingFocus){root.querySelector(`[data-input="${pendingFocus}"]`)?.focus();pendingFocus=null;}
  else if(active){const input=[...root.querySelectorAll('[data-input]')].find(el=>el.dataset.input===active);if(input){input.focus();try{input.setSelectionRange(position,end);}catch{}}}
  if(focusQuizStep){root.querySelector('.rt-quiz-progress')?.focus({preventScroll:true});focusQuizStep=false;}
  configureTimers();
 }
 listen('click',async event=>{
  if(design){const node=event.target.closest('[data-player-node]');if(node){event.preventDefault();event.stopPropagation();selected=node.dataset.playerNode;render();options.onSelect?.(selected);}else if(!event.target.closest('button')){selected='';options.onSelect?.('');}return;}
  const button=event.target.closest('button');if(button?.disabled)return;
  if(!button){
   try{
    const row=event.target.closest('[data-event="item"]');
    if(row){const n=find(row.dataset.node),index=Number(row.dataset.index);run(n.events.item,{node:n,index,item:read(n.props.variable)?.[index]});}
    else{let el=event.target.closest('[data-player-node]'),n;while(el){n=find(el.dataset.playerNode);if(n?.events.click?.length)break;el=el.parentElement?.closest('[data-player-node]');}if(!el)return;run(n.events.click,{node:n});}
    persist();render();
   }catch(error){showNotice(error.message);render();}return;
  }
  try{
   if(button.hasAttribute('data-quiz-restart')){restartQuiz();return;}
   if(button.hasAttribute('data-quiz-next')){advanceQuiz();render();persist();return;}
   if(button.dataset.timerStart){timers.start(button.dataset.timerStart);return;}
   if(button.dataset.timerPause){timers.pause(button.dataset.timerPause);return;}
   if(button.dataset.timerReset){timers.reset(button.dataset.timerReset);return;}
   if(button.hasAttribute('data-camera-open')){const n=find(button.dataset.cameraOpen);if(!n)return;const callbacks=photoCallbacks(n);await camera.open(button.closest('.rt-camera'),{facing:n.props.facing,max:Number(n.props.resolution)||960},callbacks.save,callbacks.error);return;}
   if(button.hasAttribute('data-camera-capture')){camera.capture();return;}
   if(button.hasAttribute('data-camera-stop')){camera.stop();return;}
   if(button.hasAttribute('data-camera-download')){const n=find(button.dataset.cameraDownload),src=safeImage(read(n.props.variable));if(src){const link=document.createElement('a');link.href=src;link.download='photo-'+new Date().toISOString().replace(/[:.]/g,'-')+'.jpg';link.click();}return;}
   if(button.hasAttribute('data-camera-delete')){const n=find(button.dataset.cameraDelete);localStorage.removeItem(photoKey(n.props.variable));write(n.props.variable,'');showNotice('Photo effacée.',true);persist();render();return;}
   if(button.hasAttribute('data-nav-menu'))drawerOpen=true;
   if(button.hasAttribute('data-nav-close'))drawerOpen=false;
   if(button.hasAttribute('data-nav-back'))back();
   if(button.dataset.navScreen)navigate(button.dataset.navScreen);
   if(button.dataset.rate){const n=find(button.dataset.node),val=Number(button.dataset.rate);write(n.props.variable,val);run(n.events.change,{value:val,node:n});}
   if(button.hasAttribute('data-dismiss'))showNotice('');
   if(button.dataset.remove){const list=read(button.dataset.remove)||[];write(button.dataset.remove,list.filter((_,i)=>i!==Number(button.dataset.index)));}
   if(button.dataset.cart){const list=clone(read(button.dataset.list)||[]),index=Number(button.dataset.index),item=list[index];if(item){item.quantity=numeric(item.quantity)+Number(button.dataset.cart);if(item.quantity<=0)list.splice(index,1);write(button.dataset.list,list);}}
   let quizScored;
   if(button.dataset.event){
    const n=find(button.dataset.node),index=Number(button.dataset.index),item=Number.isInteger(index)?(read(n.props.variable)||[])[index]:null;
    const pair=activeQuizPairs.find(pair=>pair.button.id===n.id);
    if(pair&&(!hasQuizAnswer(pair)||quizLocked.has(pair.answer.id)))return;
    if(n.props.quizScore&&activeQuizPairs.some(pair=>!hasQuizAnswer(pair))){
     showNotice('Réponds à toutes les questions avant de corriger.',true);render();return;
    }
    run(n.events[button.dataset.event],{item,index,node:n});
    if(pair){lockQuizAnswer(pair);if(activeQuizPairs.length===1)quizScored=screen;}
    if(n.props.quizScore){activeQuizPairs.forEach(lockQuizAnswer);quizScored=screen;}
    if(pair&&quizPage()&&!quizPage().last)focusQuizStep=true;
   }
   persist({quizScored});render();if(drawerOpen)root.querySelector('.rt-drawer button')?.focus();
  }catch(error){showNotice(error.message);render();options.onChange?.({screen,state:stateSnapshot(),log:clone(log),notice});}
 });
 listen('keydown',event=>{
  if(drawerOpen&&event.key==='Escape'){event.preventDefault();drawerOpen=false;render();root.querySelector('[data-nav-menu]')?.focus();return;}
  if(drawerOpen&&event.key==='Tab'){const buttons=[...root.querySelectorAll('.rt-drawer button')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
  if(!design&&event.key==='Enter'&&event.target.tagName==='INPUT'&&!['range','checkbox'].includes(event.target.type)){
   const form=event.target.closest('.rt-form');
   if(form){const submit=[...form.querySelectorAll('button[data-node]')].find(b=>find(b.dataset.node)?.events.click?.some(a=>a.type==='validate'));if(submit){event.preventDefault();submit.click();return;}}
  }
  if(design||!['Enter',' '].includes(event.key)||event.target.tagName==='BUTTON')return;const row=event.target.closest('[role="button"][data-event="item"]');if(row){event.preventDefault();row.click();}
 });
 listen('change',event=>{const input=event.target;if(design||!input.dataset.cameraFile||!input.files?.[0])return;const n=find(input.dataset.cameraFile);if(!n)return;const callbacks=photoCallbacks(n);camera.importFile(input.files[0],Number(n.props.resolution)||960,callbacks.save,callbacks.error);});
 const inputHandler=event=>{
  if(design||!event.target.dataset.bind)return;
  const input=event.target,n=find(input.dataset.node);
  if(quizLocked.has(n.id)){render();return;}
  try{
   const next=input.type==='checkbox'?input.checked:['number','range'].includes(input.type)?Number(input.value):input.value;
   write(input.dataset.bind,next);run(n.events.change,{value:next,node:n});
   const quiz=quizPage(),pair=activeQuizPairs.find(pair=>pair.answer.id===n.id);
   if(pair&&quiz?.current.quizLayout==='auto'&&quiz.questions[quiz.index].id===n.id&&hasQuizAnswer(pair)){
    run(pair.button.events.click,{node:pair.button});
    lockQuizAnswer(pair);
    if(!quiz.last)advanceQuiz();
    render();persist();return;
   }
   persist();render();
  }catch(error){showNotice(error.message);render();}
 };
 listen('input',event=>{if(event.target.type==='range'&&!design){try{write(event.target.dataset.bind,Number(event.target.value));const output=root.querySelector(`[data-range-output="${event.target.dataset.node}"]`);if(output)output.textContent=event.target.value;}catch(error){showNotice(error.message);render();}return;}if(event.target.tagName!=='SELECT')inputHandler(event);});listen('change',event=>{if(event.target.tagName==='SELECT'||event.target.type==='range')inputHandler(event);});
 listen('toggle',event=>{if(event.target.dataset.disclosure&&!design)disclosures.set(event.target.dataset.disclosure,event.target.open);},true);
 if(options.persist){window.addEventListener('pagehide',()=>persist(),{signal:events.signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();},{signal:events.signal});}
 listen('scroll',event=>{if(!event.target.classList?.contains('rt-screen')||!options.persist&&!options.onChange)return;clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(()=>persist(),150);},true);
 initial();restorePhotos();if(options.persist)try{restoreSnapshot(JSON.parse(localStorage.getItem('studio-app-nav-'+p.id)));}catch{}restoreSnapshot(options.snapshot);render();persist();
 return {getSnapshot,getState:()=>stateSnapshot(),getScreen:()=>screen,run:(actions,context={})=>{run(actions,context);persist();render();},destroy:()=>{clearTimeout(scrollSaveTimer);timers.destroy();disposed=true;events.abort();camera.destroy?.();camera.stop();clearTimeout(noticeTimer);},update:(next,settings={})=>{camera.stop();if(next.id!==p.id){quizPositions.clear();quizLocked.clear();state={};timers.clear();restoredTimers.clear();trail=[];drawerOpen=false;disclosures.clear();pendingFocus=null;showNotice('');}p=clone(next);for(const v of p.variables)if(!Object.hasOwn(state,v.name))state[v.name]=clone(v.initial);for(const name of Object.keys(state))if(!p.variables.some(v=>v.name===name))delete state[name];design=!!settings.design;selected=settings.selected||'';if(settings.reset){timers.clear();restoredTimers.clear();initial(false);if(!design)restorePhotos();showNotice('');log=[];trail=[];drawerOpen=false;pendingScroll=0;disclosures.clear();}if(settings.snapshot)restoreSnapshot(settings.snapshot);if(settings.screen)screen=settings.screen;render();persist();},reset:()=>{timers.clear();restoredTimers.clear();camera.stop();clearPhotos();screen=p.home;trail=[];drawerOpen=false;pendingScroll=0;disclosures.clear();initial(false);showNotice('');log=[];render();persist();},select:id=>{selected=id;render();},clear:()=>{showNotice('');render();}};
}

export const playerCSS=`
.rt-quiz-restart{display:flex;justify-content:flex-end;padding:3px 10px 5px}
.rt-quiz-restart button{border:1px solid currentColor;border-radius:6px;padding:5px 8px;color:inherit;background:transparent;cursor:pointer;font:inherit;font-size:11px}
.rt-quiz-progress{margin:0 0 6px;font-size:13px;font-weight:bold;padding:7px 10px;border-bottom:1px solid currentColor}
.rt-quiz-controls{display:flex;justify-content:space-between;gap:8px;padding:8px 12px}
.rt-quiz-controls button{padding:8px 11px;border:1px solid currentColor;border-radius:8px;color:var(--app-text);background:transparent;cursor:pointer;font-weight:bold}
.rt-quiz-controls button:disabled{opacity:.45;cursor:default}
.rt-quiz-controls [data-quiz-next]{margin-left:auto;background:var(--app-primary);color:var(--app-on-primary);border-color:transparent}

*{box-sizing:border-box}.app-player{position:relative;background:var(--app-background,#fff8ef);color:var(--app-text,#29173f);font-family:'Trebuchet MS',Arial,sans-serif;height:100%;overflow:hidden}.rt-screen{height:100%;overflow:auto;padding:12px 8px 50px;scrollbar-width:thin}.rt-drag-handle{display:none;position:absolute;top:1px;left:0;font:18px Arial;color:#78518f;cursor:grab;opacity:.55;z-index:3;padding:2px}.rt-selected>.rt-drag-handle{display:block;background:#eee1fa;border-radius:4px;opacity:.85}.rt-drag-handle:hover{opacity:1}.rt-node{position:relative;min-width:0;flex-shrink:1;overflow-wrap:anywhere}.app-icon{display:inline-block;vertical-align:middle;flex-shrink:0}.rt-button-content{display:flex;align-items:center;justify-content:center;gap:9px}.rt-icon-button{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:4px;background:transparent;color:inherit;border:0;cursor:pointer}.rt-icon-standalone{display:inline-flex;align-items:center;justify-content:center}.rt-copy{white-space:pre-wrap;margin:0;font-size:inherit;line-height:1.5}.rt-node h2{font-size:inherit;line-height:1.2;letter-spacing:-.6px}.rt-image{width:100%;display:block;border-radius:var(--app-radius,12px)}.rt-button{display:block;width:100%;border:0;border-radius:var(--app-radius,12px);background:var(--app-primary,#6339c7);color:var(--app-on-primary,#fff);padding:13px 16px;font:700 14px 'Trebuchet MS',sans-serif;cursor:pointer}.rt-button:disabled{opacity:.45;cursor:default}.rt-button:active{transform:translateY(1px)}.rt-label{display:block;font-size:12px;font-weight:700;line-height:1.7}.rt-label input,.rt-label textarea,.rt-label select{display:block;width:100%;margin-top:6px;border:1px solid #d6c6dc;border-radius:8px;background:#fff;color:#392544;padding:11px;font:14px 'Trebuchet MS',sans-serif}.rt-label textarea{min-height:90px;resize:vertical}.rt-label input:focus,.rt-label textarea:focus{outline:2px solid var(--app-primary)}.rt-switch{display:flex;align-items:center;justify-content:space-between;font-size:14px;gap:10px}.rt-switch input{width:24px;height:24px;accent-color:var(--app-primary)}.rt-divider{border:0;border-top:1px solid #dbd0de;margin:8px 0}.rt-container{display:flex;align-items:stretch;min-height:35px}.rt-list{display:flex;flex-direction:column;gap:9px}.rt-list-item{border:1px solid #dfd2df;background:#ffffff9c;border-radius:10px;padding:10px;display:flex;gap:10px;align-items:center}.rt-list-item>img{width:65px;height:65px;object-fit:cover;border-radius:8px}.rt-item-copy{font-size:13px;flex:1;white-space:pre-wrap;min-width:0;line-height:1.5}.rt-item-copy b{display:block;margin-top:5px}.rt-small{width:auto;font-size:11px;padding:9px;flex-shrink:0}.rt-remove{background:transparent;border:0;color:#b36c79;font-size:15px;cursor:pointer;padding:8px}.rt-list-empty{padding:22px 12px;text-align:center;color:#a08ba6;border:1px dashed #d6c9df;border-radius:9px;font-size:12px}.rt-cart-row{display:flex;gap:8px;align-items:center;padding:13px 0;border-bottom:1px solid #e4d8e4;font-size:12px}.rt-cart-row>span{flex:1;min-width:0}.rt-cart-row small{display:block;color:#a08aa5;margin-top:5px}.rt-cart-row>div{display:flex;align-items:center;gap:9px}.rt-cart-row button{background:#eee1f2;border:0;width:27px;height:27px;border-radius:5px;cursor:pointer}.rt-cart-row>strong{min-width:55px;text-align:right}.rt-receipt{padding:15px 0;font-size:12px}.rt-receipt>div{display:flex;justify-content:space-between;padding:8px 0;gap:12px}.rt-receipt .rt-total{border-top:1px dashed #cbb8d3;font-size:18px;font-weight:800;margin-top:8px;padding-top:15px}.rt-empty{padding:20px;text-align:center;font-size:12px;color:#9d7eb6;border:2px dashed #cfb6e1;border-radius:8px;min-width:50px;flex:1}.rt-root-empty{margin:35px 12px;min-height:250px;display:grid;place-items:center}.rt-design{outline:1px dashed #c4a9d566;outline-offset:-2px;cursor:pointer}.rt-design:hover{outline:2px solid #b699d3}.rt-selected{outline:2px solid #7542b8!important;outline-offset:-2px}.rt-design button,.rt-design input,.rt-design textarea,.rt-design select{pointer-events:none}.rt-notice{position:absolute;bottom:15px;left:12px;right:12px;background:#362044;color:white;padding:14px 35px 14px 14px;border-radius:9px;font-size:13px;line-height:1.7;box-shadow:0 4px 15px #0002;white-space:pre-wrap;z-index:10}.rt-notice button{position:absolute;top:8px;right:8px;color:inherit;background:none;border:0;cursor:pointer;padding:5px}.rt-image-placeholder{padding:50px;background:#f1e5f3;text-align:center;color:#a586b3}.rt-node .rt-label,.rt-node .rt-label input,.rt-node .rt-label textarea,.rt-node .rt-label select,.rt-node .rt-switch,.rt-node .rt-item-copy,.rt-node .rt-cart-row,.rt-node .rt-receipt,.rt-node .rt-list-empty,.rt-node .rt-small{font-size:inherit}.rt-node .rt-label input,.rt-node .rt-label textarea,.rt-node .rt-label select{color:var(--node-color,#392544)}.rt-image{border-radius:var(--node-radius,var(--app-radius))}.rt-custom-button{font-size:inherit;text-align:inherit;color:var(--node-color,var(--app-on-primary));background:var(--node-background,var(--app-primary));border-radius:var(--node-radius,var(--app-radius))}.rt-drop-over{outline:3px solid #ff9d42!important;outline-offset:-4px}

.rt-app-frame{height:100%;display:flex;flex-direction:column;position:relative;min-height:0;isolation:isolate}.rt-app-frame>.rt-screen{height:auto;flex:1;min-height:0}.app-player .rt-app-header{height:54px;min-height:54px;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:4px;padding:4px 8px;border:0;border-bottom:1px solid #29173f18;background:var(--app-background);margin:0;color:var(--app-text)}.rt-header-icon,.rt-menu-floating{display:grid;place-items:center}.rt-app-header>button:disabled{opacity:.3;cursor:default}.rt-app-header>strong{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.rt-app-header>button,.rt-menu-floating{width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:inherit;font-size:23px;cursor:pointer}.rt-tabs{display:flex;flex-shrink:0;overflow-x:auto;min-height:62px;padding:4px max(4px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom));border-top:1px solid #29173f20;background:var(--app-background);gap:3px}.rt-tabs>button{flex:1;min-width:54px;max-width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:9px;background:transparent;color:var(--app-text);padding:6px 4px;cursor:pointer}.rt-tabs>button>span{font-size:20px;line-height:1}.rt-tabs>button>b{font-size:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rt-tabs>button.active{color:var(--app-primary);background:color-mix(in srgb,var(--app-primary) 12%,transparent)}.rt-tabs button:focus-visible,.rt-drawer button:focus-visible{outline:2px solid var(--app-primary);outline-offset:-2px}.rt-menu-floating{position:absolute;top:8px;right:10px;z-index:4;background:var(--app-background);box-shadow:0 3px 12px #0002}.rt-menu-layer{position:absolute;inset:0;z-index:30}.rt-menu-shade{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:#29173f70}.rt-drawer{position:absolute;top:0;bottom:0;left:0;width:min(85%,290px);background:var(--app-background);color:var(--app-text);display:flex;flex-direction:column;padding:12px;box-shadow:5px 0 25px #0003}.rt-drawer-heading{display:flex;align-items:center;gap:10px;padding:4px 0 16px}.rt-drawer-heading strong{flex:1;overflow-wrap:anywhere;font-size:16px}.rt-drawer-heading button{border:0;background:transparent;color:inherit;font-size:21px;width:44px;height:44px}.rt-drawer nav{overflow:auto;min-height:0;flex:1}.rt-drawer nav button{display:flex;align-items:center;gap:14px;width:100%;min-height:48px;padding:12px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;font-size:14px}.rt-drawer nav button span{font-size:20px;width:24px;text-align:center}.rt-drawer nav button.active{background:var(--app-primary);color:var(--app-on-primary)}

.rt-badge{display:inline-block;padding:5px 11px;border-radius:var(--node-radius,20px);background:var(--node-background,var(--app-primary));color:var(--node-color,var(--app-on-primary));font-size:inherit;font-weight:700}.rt-range-label output,.rt-progress-label>span{float:right;font-weight:800;color:var(--app-primary)}.rt-range-label input[type=range]{accent-color:var(--app-primary);padding:8px 0;min-height:40px;border:0;background:transparent;cursor:pointer}.rt-progress-label progress{display:block;width:100%;height:20px;margin-top:9px;accent-color:var(--app-primary)}.rt-rating>span{display:block;font-size:inherit;font-weight:700;margin-bottom:7px}.rt-rating>div{display:flex;flex-wrap:wrap;gap:3px}.rt-rating button{border:0;background:transparent;color:#c9b9ce;font-size:28px;min-height:40px;min-width:36px;padding:2px;cursor:pointer}.rt-rating button.active{color:#c58a00}.rt-form{display:flex;flex-direction:column;border:1px solid #29173f20;border-radius:var(--node-radius,10px);padding:8px}.rt-form h3{font-size:inherit;margin:6px 10px 10px}.rt-accordion{border:1px solid #29173f20;border-radius:var(--node-radius,10px);overflow:hidden}.rt-accordion>summary{padding:14px;min-height:44px;cursor:pointer;font-weight:700;font-size:inherit}.rt-accordion-content{display:flex;flex-direction:column;padding:4px 8px 10px}.rt-accordion[open]>summary{border-bottom:1px solid #29173f15}

.app-player{font-family:var(--app-font,'Trebuchet MS',Arial,sans-serif)}.app-player button,.app-player input,.app-player textarea,.app-player select{font-family:inherit}.rt-list-item{background:color-mix(in srgb,var(--app-background) 92%,var(--app-text) 8%);border-color:color-mix(in srgb,var(--app-text) 20%,transparent)}.rt-cart-row,.rt-divider,.rt-accordion,.rt-form{border-color:color-mix(in srgb,var(--app-text) 20%,transparent)}.rt-cart-row button{background:color-mix(in srgb,var(--app-background) 85%,var(--app-text) 15%);color:var(--app-text)}.rt-cart-row small,.rt-list-empty{color:color-mix(in srgb,var(--app-text) 68%,var(--app-background) 32%)}

.rt-node .rt-label input,.rt-node .rt-label textarea,.rt-node .rt-label select{background:var(--field-background,#ffffff);color:var(--field-color,#000000);border-radius:var(--node-radius,var(--app-radius))}.rt-list-item{border-radius:var(--node-radius,var(--app-radius))}

.rt-product-detail{display:flex;flex-direction:column;gap:15px}.rt-detail-image{display:block;width:100%;height:230px;object-fit:cover;border-radius:var(--node-radius,var(--app-radius))}.rt-product-detail h3{font-size:1.65em;margin:0;line-height:1.2}.rt-product-detail p{margin:0;font-size:inherit;line-height:1.6;white-space:pre-wrap}.rt-detail-price{font-size:1.4em}.rt-product-detail .rt-button{font-size:inherit}

.app-player[data-has-tabs="true"]>.rt-notice{bottom:calc(76px + env(safe-area-inset-bottom,0px))}

.rt-cart-row button{width:44px;height:44px}.rt-small,.rt-remove{min-height:44px}.rt-remove{min-width:44px}.rt-rating button{min-width:44px;min-height:44px}.rt-label input,.rt-label select{min-height:44px}.rt-notice{padding-right:54px;max-height:45%;overflow:auto;min-height:50px}.rt-notice button{width:44px;height:44px;top:3px;right:3px;padding:8px}.rt-drawer nav button b{min-width:0;overflow-wrap:anywhere}

.rt-node[data-presentation=card]{background:color-mix(in srgb,var(--app-background) 94%,var(--app-text) 6%)}.rt-node[data-presentation=banner]{background:var(--app-primary)}
.rt-camera{display:flex;flex-direction:column;gap:12px}.rt-camera-stage{background:color-mix(in srgb,var(--app-text) 8%,var(--app-background));border-radius:12px;overflow:hidden}.rt-camera-stage video,.rt-camera-stage img{display:block;width:100%;max-height:320px;object-fit:contain}.rt-camera [hidden]{display:none!important}.rt-camera-empty{min-height:160px;display:grid;place-items:center;opacity:.55}.rt-camera-controls{display:flex;flex-wrap:wrap;gap:8px}.rt-camera-secondary{min-height:44px;display:flex;align-items:center;justify-content:center;flex:1 1 45%;border:1px solid currentColor;border-radius:9px;padding:8px;font-size:12px;cursor:pointer}.rt-camera>small{font-size:11px;opacity:.75}
.rt-timer{display:flex;flex-direction:column;gap:12px;text-align:center}.rt-timer>strong{font-size:inherit}.rt-timer-value{display:block;font-size:2.8em;font-weight:bold;font-variant-numeric:tabular-nums;line-height:1.2;letter-spacing:1px}.rt-timer-value.rt-timer-long{font-size:1.9em}.rt-timer-controls{display:flex;gap:8px;flex-wrap:wrap}.rt-timer-controls>.rt-button{flex:1 1 90px;width:auto;padding:11px 8px;min-height:44px}.rt-timer-reset{border:1px solid currentColor;border-radius:9px;flex:1 1 100%;padding:10px;min-height:44px;color:inherit;font-size:12px}
`;
