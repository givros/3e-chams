// Shared by the editor preview and the exported standalone application.
export function createPlayer(root,project,options={}){
 let p=structuredClone(project),screen=p.home,state={},notice='',design=!!options.design,selected=options.selected||'',log=[];
 let trail=[],pendingScroll=null,drawerOpen=false,pendingFocus=null;const disclosures=new Map();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=v=>v===undefined?null:structuredClone(v),money=n=>(Number.isFinite(Number(n))?Number(n):0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 const numeric=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
 const productKey=(item,props)=>{if(item.id!==undefined)return String(item.id);const source=JSON.stringify([typeof item==='object'?item[props.nameField||'name']:String(item),item[props.priceField||'price'],item[props.imageField||'image']]);let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);return 'item_'+(hash>>>0).toString(36);};
 const cartRows=name=>{const list=read(name);return Array.isArray(list)?list.map((item,index)=>({item,index})).filter(({item})=>item&&typeof item==='object'&&!Array.isArray(item)):[];};
 const cartTotal=name=>cartRows(name).reduce((sum,{item})=>sum+numeric(item.price)*numeric(item.quantity),0);
 const safeImage=src=>typeof src==='string'&&(/^(data:image\/(png|jpeg|webp|gif);base64,)/.test(src)||/^assets\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(src))?src:'';
 const safePath=(obj,path)=>{for(const key of String(path).split('.')){if(['__proto__','constructor','prototype'].includes(key))return '';obj=obj?.[key];}return obj;};
 function read(name,stack=[]){if(stack.includes(name))return 0;const v=p.variables.find(v=>v.name===name);return v?.type==='computed'?value(v.formula||{}, {},[...stack,name]):Object.hasOwn(state,name)?state[name]:undefined;}
 function value(v,context={},stack=[]){if(!v)return '';if(v.kind==='literal')return v.value;if(v.kind==='variable')return read(v.name,stack);if(v.kind==='input')return context.value??'';if(v.kind==='item')return v.field?safePath(context.item,v.field):context.item;if(v.kind==='length'){const list=read(v.name,stack);return Array.isArray(list)||typeof list==='string'?list.length:0;}if(v.kind==='cartTotal'){const list=read(v.name,stack);return Array.isArray(list)?list.reduce((sum,item)=>sum+numeric(item?.price)*numeric(item?.quantity),0):0;}if(v.kind==='math'){const a=numeric(value(v.a,context,stack)),b=numeric(value(v.b,context,stack));return numeric(v.op==='subtract'?a-b:v.op==='multiply'?a*b:v.op==='divide'?(b?a/b:0):a+b);}return '';}
 function template(text,context={}){return String(text??'').replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_,path)=>{if(path==='index')return context.index??'';if(path==='item')return typeof context.item==='object'?context.item?.name??JSON.stringify(context.item):context.item??'';if(path.startsWith('item.'))return typeof context.item==='string'&&path==='item.name'?context.item:safePath(context.item,path.slice(5))??'';const [name,...rest]=path.split('.');const result=rest.length?safePath(read(name),rest.join('.')):read(name);return typeof result==='object'?JSON.stringify(result):result??'';});}
 function condition(c,context){const a=value(c.left,context),b=value(c.right,context);switch(c.op){case'eq':return String(a)===String(b);case'neq':return String(a)!==String(b);case'gt':return Number(a)>Number(b);case'gte':return Number(a)>=Number(b);case'lt':return Number(a)<Number(b);case'lte':return Number(a)<=Number(b);case'contains':return String(a).includes(String(b));case'empty':return a===null||a===undefined||a===''||Array.isArray(a)&&a.length===0;default:return false;}}
 function write(name,next){const v=p.variables.find(v=>v.name===name);if(!v||v.type==='computed')throw Error('Variable introuvable : '+name);if(v.type==='number'){next=Number(next);if(!Number.isFinite(next))throw Error('La valeur doit être un nombre.');}if(v.type==='text')next=String(next??'');if(v.type==='boolean')next=next===true||next==='true';if(v.type==='list'&&!Array.isArray(next))throw Error('La valeur doit être une liste.');state[name]=clone(next);}
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
  if(a.type==='toast')notice=template(value(a.value,context),context);
  if(a.type==='if'){const matches=(a.conditions||[]).map(c=>condition(c,context));run((matches.length&&(a.join==='or'?matches.some(Boolean):matches.every(Boolean)))?a.then:a.else,context,depth+1);}
  if(a.type==='cartAdd'){
   const list=read(a.variable);if(!Array.isArray(list)||!context.item)throw Error('Cette action utilise un article de catalogue et une liste panier.');
   const item=context.item,props=context.node?.props||{},source=props.variable||context.node?.id||'item',id=source+':'+productKey(item,props),qty=Math.max(1,numeric(a.quantity,1));
   const name=item[props.nameField||'name']??item.name??String(item),price=numeric(item[props.priceField||'price']),image=item[props.imageField||'image']||'';
   const foundIndex=list.findIndex(x=>x&&(x.id===id||((String(x.id).startsWith(source+':')&&/^\d+$/.test(String(x.id).slice(source.length+1))||/^\d+$/.test(String(x.id)))&&x.name===name&&numeric(x.price)===price&&(x.image||'')===image)));
   const next=clone(list);if(foundIndex>=0){next[foundIndex].id=id;next[foundIndex].quantity=numeric(next[foundIndex].quantity)+qty;}else next.push({id,name,price,image,quantity:qty});write(a.variable,next);
  }
  if(a.type==='reset')for(const v of p.variables)state[v.name]=clone(v.initial);
  log.push({action:a.type,variable:a.variable||'',screen});if(log.length>50)log.shift();
 }}
 function initial(restore=true){state=Object.fromEntries(p.variables.map(v=>[v.name,clone(v.initial)]));if(restore&&options.persist){try{const saved=JSON.parse(localStorage.getItem('studio-app-'+p.id));if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const v of p.variables)if(Object.hasOwn(saved,v.name)&&v.type!=='computed'&&(v.type==='list'?Array.isArray(saved[v.name]):v.type==='number'?typeof saved[v.name]==='number'&&Number.isFinite(saved[v.name]):typeof saved[v.name]===typeof v.initial))state[v.name]=clone(saved[v.name]);}catch{}}}
 function stateSnapshot(){const output=clone(state);for(const v of p.variables)if(v.type==='computed')output[v.name]=clone(read(v.name));return output;}
 function persist(){if(options.persist){try{localStorage.setItem('studio-app-'+p.id,JSON.stringify(state));}catch{}}options.onChange?.({screen,state:stateSnapshot(),log:clone(log),notice});}
 function nodes(list){return list.map(node=>renderNode(node)).join('');}
 function renderNode(n,context={}){
  const x=n.props,s=n.style||{},visible=x.visibleVariable?!!read(x.visibleVariable):true;if(!visible)return '';
  const id=esc(n.id),text=esc(template(x.text,context)+(x.textVariable?String(read(x.textVariable)??''):'')),tag=n.type==='heading'?'h2':'div';let body='';
  if(n.type==='heading'||n.type==='text')body=`<${tag} class="rt-copy">${text}</${tag}>`;
  if(n.type==='badge')body=`<span class="rt-badge">${text}</span>`;
  if(n.type==='image'){const src=safeImage(template(x.src,context));body=src?`<img class="rt-image" src="${esc(src)}" alt="${esc(x.alt||'')}" style="height:${Number(x.height)||180}px;object-fit:${x.fit==='contain'?'contain':'cover'}">`:'<div class="rt-image-placeholder">Image</div>';}
  if(n.type==='button'||n.type==='back')body=`<button type="button" class="rt-button rt-custom-button" data-event="click" data-node="${id}">${text}</button>`;
  if(['input','number','textarea','select','toggle','search','date'].includes(n.type)){
   const val=read(x.variable)??'',input=`data-bind="${esc(x.variable||'')}" data-node="${id}" data-input="${id}" ${x.required?'aria-required="true"':''}`;
   if(n.type==='textarea')body=`<label class="rt-label">${esc(x.label||'')}<textarea ${input} placeholder="${esc(x.placeholder||'')}">${esc(val)}</textarea></label>`;
   else if(n.type==='select')body=`<label class="rt-label">${esc(x.label||'')}<select ${input}><option value="" ${val===''?'selected':''}>Choisir…</option>${String(x.options||'').split('\n').map(option=>`<option ${String(val)===option?'selected':''}>${esc(option)}</option>`).join('')}</select></label>`;
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
  if(n.type==='progress'){
   const max=Math.max(1,numeric(x.max,100)),val=Math.min(max,Math.max(0,numeric(read(x.variable)))),percent=Math.round(val/max*100);
   body=`<label class="rt-label rt-progress-label">${esc(x.label||'Progression')}<span>${percent} %</span><progress max="${max}" value="${val}">${percent} %</progress></label>`;
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
  const style=`padding:${Math.max(0,Number(s.padding)||0)}px;text-align:${['left','center','right'].includes(s.align)?s.align:'left'};font-size:${Math.min(72,Math.max(8,Number(s.fontSize)||14))}px;width:${['100%','75%','50%','auto'].includes(s.width)?s.width:'100%'};border-radius:${Math.max(0,numeric(s.radius))}px;--node-radius:${Math.max(0,numeric(s.radius))}px;${/^#[0-9a-f]{6}$/i.test(s.color||'')?'color:'+s.color+';--node-color:'+s.color+';':''}${/^#[0-9a-f]{6}$/i.test(s.background||'')?'background:'+s.background+';--node-background:'+s.background+';':''}`;
  return `<section data-player-node="${id}" ${design?`draggable="true" data-move-node="${id}"`:''} class="rt-node ${design?'rt-design':''} ${selected===n.id?'rt-selected':''}" style="${style}">${body}</section>`;
 }
 function find(id){let result;const visit=list=>{for(const n of list){if(n.id===id)result=n;visit(n.children||[]);}};for(const s of p.screens)visit(s.nodes);return result;}
 function navigationHTML(current){
  const nav=p.navigation;if(!nav?.enabled)return {header:'',footer:'',drawer:''};
  const items=(nav.items||[]).map(id=>p.screens.find(s=>s.id===id)).filter(Boolean),disabled=design?'disabled':'';
  const itemHTML=s=>`<button type="button" data-nav-screen="${esc(s.id)}" class="${s.id===screen?'active':''}" ${s.id===screen?'aria-current="page"':''} ${disabled}><span aria-hidden="true">${esc(s.menuIcon||'●')}</span><b>${esc(s.menuLabel||s.name)}</b></button>`;
  const header=nav.showHeader!==false?`<header class="rt-app-header" ${drawerOpen?'inert':''}>${nav.showBack!==false&&(trail.length||screen!==p.home)?`<button type="button" data-nav-back aria-label="Retour à l’écran précédent" ${disabled}>←</button>`:'<span></span>'}<strong>${esc(current.name)}</strong>${nav.style==='drawer'?`<button type="button" data-nav-menu aria-label="Ouvrir le menu" aria-expanded="${drawerOpen}" ${disabled}>☰</button>`:'<span></span>'}</header>`:'';
  const footer=nav.style==='tabs'?`<nav class="rt-tabs" aria-label="Menu de l’application" ${drawerOpen?'inert':''}>${items.map(itemHTML).join('')}</nav>`:nav.showHeader===false?`<button type="button" class="rt-menu-floating" data-nav-menu aria-label="Ouvrir le menu" ${disabled}>☰</button>`:'';
  const drawer=drawerOpen?`<div class="rt-menu-layer"><button type="button" class="rt-menu-shade" data-nav-close aria-label="Fermer le menu"></button><div class="rt-drawer" role="dialog" aria-modal="true" aria-label="Menu de l’application"><div class="rt-drawer-heading"><strong>${esc(p.name)}</strong><button type="button" data-nav-close aria-label="Fermer le menu">✕</button></div><nav>${items.map(itemHTML).join('')}</nav></div></div>`:'';
  return {header,footer,drawer};
 }
 function render(){
  const originalInput=root.contains(document.activeElement)&&document.activeElement?.dataset?.input?document.activeElement:null;
  const active=originalInput?.dataset?.input,position=originalInput?.selectionStart,end=originalInput?.selectionEnd,oldScroll=root.querySelector('.rt-screen')?.scrollTop||0;
  const current=p.screens.find(s=>s.id===screen)||p.screens[0];screen=current.id;
  const channels=p.theme.primary.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;root.style.setProperty('--app-on-primary',(luminance+.05)/.05>=4.5?'#000000':'#ffffff');
  root.style.setProperty('--app-primary',p.theme.primary);root.style.setProperty('--app-background',current.background||p.theme.background);root.style.setProperty('--app-text',p.theme.text);root.style.setProperty('--app-radius',p.theme.radius+'px');
  const nav=navigationHTML(current);
  root.innerHTML=`<div class="rt-app-frame">${nav.header}<div class="rt-screen" data-player-drop="root" ${drawerOpen?'inert':''}>${nodes(current.nodes)}${design&&!current.nodes.length?'<div class="rt-empty rt-root-empty">Glisse un composant ici</div>':''}</div>${nav.footer}${nav.drawer}</div>${notice?`<div class="rt-notice" role="status">${esc(notice)}<button type="button" data-dismiss aria-label="Fermer le message">✕</button></div>`:''}`;
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
 }
 root.addEventListener('click',event=>{
  if(design){const node=event.target.closest('[data-player-node]');if(node){event.preventDefault();event.stopPropagation();selected=node.dataset.playerNode;render();options.onSelect?.(selected);}return;}
  const button=event.target.closest('button');if(button?.disabled)return;
  if(!button){
   try{
    const row=event.target.closest('[data-event="item"]');
    if(row){const n=find(row.dataset.node),index=Number(row.dataset.index);run(n.events.item,{node:n,index,item:read(n.props.variable)?.[index]});}
    else{let el=event.target.closest('[data-player-node]'),n;while(el){n=find(el.dataset.playerNode);if(n?.events.click?.length)break;el=el.parentElement?.closest('[data-player-node]');}if(!el)return;run(n.events.click,{node:n});}
    persist();render();
   }catch(error){notice=error.message;render();}return;
  }
  try{
   if(button.hasAttribute('data-nav-menu'))drawerOpen=true;
   if(button.hasAttribute('data-nav-close'))drawerOpen=false;
   if(button.hasAttribute('data-nav-back'))back();
   if(button.dataset.navScreen)navigate(button.dataset.navScreen);
   if(button.dataset.rate){const n=find(button.dataset.node),val=Number(button.dataset.rate);write(n.props.variable,val);run(n.events.change,{value:val,node:n});}
   if(button.hasAttribute('data-dismiss'))notice='';
   if(button.dataset.remove){const list=read(button.dataset.remove)||[];write(button.dataset.remove,list.filter((_,i)=>i!==Number(button.dataset.index)));}
   if(button.dataset.cart){const list=clone(read(button.dataset.list)||[]),index=Number(button.dataset.index),item=list[index];if(item){item.quantity=numeric(item.quantity)+Number(button.dataset.cart);if(item.quantity<=0)list.splice(index,1);write(button.dataset.list,list);}}
   if(button.dataset.event){const n=find(button.dataset.node),index=Number(button.dataset.index),item=Number.isInteger(index)?(read(n.props.variable)||[])[index]:null;run(n.events[button.dataset.event],{item,index,node:n});}
   persist();render();if(drawerOpen)root.querySelector('.rt-drawer button')?.focus();
  }catch(error){notice=error.message;render();options.onChange?.({screen,state:stateSnapshot(),log:clone(log),notice});}
 });
 root.addEventListener('keydown',event=>{
  if(drawerOpen&&event.key==='Escape'){event.preventDefault();drawerOpen=false;render();root.querySelector('[data-nav-menu]')?.focus();return;}
  if(drawerOpen&&event.key==='Tab'){const buttons=[...root.querySelectorAll('.rt-drawer button')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
  if(!design&&event.key==='Enter'&&event.target.tagName==='INPUT'&&!['range','checkbox'].includes(event.target.type)){
   const form=event.target.closest('.rt-form');
   if(form){const submit=[...form.querySelectorAll('button[data-node]')].find(b=>find(b.dataset.node)?.events.click?.some(a=>a.type==='validate'));if(submit){event.preventDefault();submit.click();return;}}
  }
  if(design||!['Enter',' '].includes(event.key)||event.target.tagName==='BUTTON')return;const row=event.target.closest('[role="button"][data-event="item"]');if(row){event.preventDefault();row.click();}
 });
 const inputHandler=event=>{if(design||!event.target.dataset.bind)return;const input=event.target,n=find(input.dataset.node);try{const next=input.type==='checkbox'?input.checked:['number','range'].includes(input.type)?Number(input.value):input.value;write(input.dataset.bind,next);run(n.events.change,{value:next,node:n});persist();render();}catch(error){notice=error.message;render();}};
 root.addEventListener('input',event=>{if(event.target.type==='range'&&!design){try{write(event.target.dataset.bind,Number(event.target.value));const output=root.querySelector(`[data-range-output="${event.target.dataset.node}"]`);if(output)output.textContent=event.target.value;}catch(error){notice=error.message;render();}return;}if(event.target.tagName!=='SELECT')inputHandler(event);});root.addEventListener('change',event=>{if(event.target.tagName==='SELECT'||event.target.type==='range')inputHandler(event);});
 root.addEventListener('toggle',event=>{if(event.target.dataset.disclosure&&!design)disclosures.set(event.target.dataset.disclosure,event.target.open);},true);
 initial();render();persist();
 return {getState:()=>stateSnapshot(),getScreen:()=>screen,run:(actions,context={})=>{run(actions,context);persist();render();},update:(next,settings={})=>{if(next.id!==p.id){trail=[];drawerOpen=false;disclosures.clear();pendingFocus=null;}p=clone(next);for(const v of p.variables)if(!Object.hasOwn(state,v.name))state[v.name]=clone(v.initial);for(const name of Object.keys(state))if(!p.variables.some(v=>v.name===name))delete state[name];design=!!settings.design;selected=settings.selected||'';if(settings.reset){initial(false);notice='';log=[];trail=[];drawerOpen=false;pendingScroll=0;disclosures.clear();}if(settings.screen)screen=settings.screen;render();persist();},reset:()=>{screen=p.home;trail=[];drawerOpen=false;pendingScroll=0;disclosures.clear();initial(false);notice='';log=[];render();persist();},select:id=>{selected=id;render();},clear:()=>{notice='';render();}};
}

export const playerCSS=`
*{box-sizing:border-box}.app-player{position:relative;background:var(--app-background,#fff8ef);color:var(--app-text,#29173f);font-family:'Trebuchet MS',Arial,sans-serif;height:100%;overflow:hidden}.rt-screen{height:100%;overflow:auto;padding:12px 8px 50px;scrollbar-width:thin}.rt-node{position:relative;min-width:0;flex-shrink:1;overflow-wrap:anywhere}.rt-copy{white-space:pre-wrap;margin:0;font-size:inherit;line-height:1.5}.rt-node h2{font-size:inherit;line-height:1.2;letter-spacing:-.6px}.rt-image{width:100%;display:block;border-radius:var(--app-radius,12px)}.rt-button{display:block;width:100%;border:0;border-radius:var(--app-radius,12px);background:var(--app-primary,#6339c7);color:var(--app-on-primary,#fff);padding:13px 16px;font:700 14px 'Trebuchet MS',sans-serif;cursor:pointer}.rt-button:disabled{opacity:.45;cursor:default}.rt-button:active{transform:translateY(1px)}.rt-label{display:block;font-size:12px;font-weight:700;line-height:1.7}.rt-label input,.rt-label textarea,.rt-label select{display:block;width:100%;margin-top:6px;border:1px solid #d6c6dc;border-radius:8px;background:#fff;color:#392544;padding:11px;font:14px 'Trebuchet MS',sans-serif}.rt-label textarea{min-height:90px;resize:vertical}.rt-label input:focus,.rt-label textarea:focus{outline:2px solid var(--app-primary)}.rt-switch{display:flex;align-items:center;justify-content:space-between;font-size:14px;gap:10px}.rt-switch input{width:24px;height:24px;accent-color:var(--app-primary)}.rt-divider{border:0;border-top:1px solid #dbd0de;margin:8px 0}.rt-container{display:flex;align-items:stretch;min-height:35px}.rt-list{display:flex;flex-direction:column;gap:9px}.rt-list-item{border:1px solid #dfd2df;background:#ffffff9c;border-radius:10px;padding:10px;display:flex;gap:10px;align-items:center}.rt-list-item>img{width:65px;height:65px;object-fit:cover;border-radius:8px}.rt-item-copy{font-size:13px;flex:1;white-space:pre-wrap;min-width:0;line-height:1.5}.rt-item-copy b{display:block;margin-top:5px}.rt-small{width:auto;font-size:11px;padding:9px;flex-shrink:0}.rt-remove{background:transparent;border:0;color:#b36c79;font-size:15px;cursor:pointer;padding:8px}.rt-list-empty{padding:22px 12px;text-align:center;color:#a08ba6;border:1px dashed #d6c9df;border-radius:9px;font-size:12px}.rt-cart-row{display:flex;gap:8px;align-items:center;padding:13px 0;border-bottom:1px solid #e4d8e4;font-size:12px}.rt-cart-row>span{flex:1;min-width:0}.rt-cart-row small{display:block;color:#a08aa5;margin-top:5px}.rt-cart-row>div{display:flex;align-items:center;gap:9px}.rt-cart-row button{background:#eee1f2;border:0;width:27px;height:27px;border-radius:5px;cursor:pointer}.rt-cart-row>strong{min-width:55px;text-align:right}.rt-receipt{padding:15px 0;font-size:12px}.rt-receipt>div{display:flex;justify-content:space-between;padding:8px 0;gap:12px}.rt-receipt .rt-total{border-top:1px dashed #cbb8d3;font-size:18px;font-weight:800;margin-top:8px;padding-top:15px}.rt-empty{padding:20px;text-align:center;font-size:12px;color:#9d7eb6;border:2px dashed #cfb6e1;border-radius:8px;min-width:50px;flex:1}.rt-root-empty{margin:35px 12px;min-height:250px;display:grid;place-items:center}.rt-design{outline:1px dashed #c4a9d566;outline-offset:-2px;cursor:pointer}.rt-design:hover{outline:2px solid #b699d3}.rt-selected{outline:2px solid #7542b8!important;outline-offset:-2px}.rt-design button,.rt-design input,.rt-design textarea,.rt-design select{pointer-events:none}.rt-notice{position:absolute;bottom:15px;left:12px;right:12px;background:#362044;color:white;padding:14px 35px 14px 14px;border-radius:9px;font-size:13px;line-height:1.7;box-shadow:0 4px 15px #0002;white-space:pre-wrap;z-index:10}.rt-notice button{position:absolute;top:8px;right:8px;color:inherit;background:none;border:0;cursor:pointer;padding:5px}.rt-image-placeholder{padding:50px;background:#f1e5f3;text-align:center;color:#a586b3}.rt-node .rt-label,.rt-node .rt-label input,.rt-node .rt-label textarea,.rt-node .rt-label select,.rt-node .rt-switch,.rt-node .rt-item-copy,.rt-node .rt-cart-row,.rt-node .rt-receipt,.rt-node .rt-list-empty,.rt-node .rt-small{font-size:inherit}.rt-node .rt-label input,.rt-node .rt-label textarea,.rt-node .rt-label select{color:var(--node-color,#392544)}.rt-image{border-radius:var(--node-radius,var(--app-radius))}.rt-custom-button{font-size:inherit;text-align:inherit;color:var(--node-color,var(--app-on-primary));background:var(--node-background,var(--app-primary));border-radius:var(--node-radius,var(--app-radius))}.rt-drop-over{outline:3px solid #ff9d42!important;outline-offset:-4px}

.rt-app-frame{height:100%;display:flex;flex-direction:column;position:relative;min-height:0;isolation:isolate}.rt-app-frame>.rt-screen{height:auto;flex:1;min-height:0}.app-player .rt-app-header{height:54px;min-height:54px;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:4px;padding:4px 8px;border:0;border-bottom:1px solid #29173f18;background:var(--app-background);margin:0;color:var(--app-text)}.rt-app-header>strong{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.rt-app-header>button,.rt-menu-floating{width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:inherit;font-size:23px;cursor:pointer}.rt-tabs{display:flex;flex-shrink:0;overflow-x:auto;min-height:62px;padding:4px max(4px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom));border-top:1px solid #29173f20;background:var(--app-background);gap:3px}.rt-tabs>button{flex:1;min-width:54px;max-width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:9px;background:transparent;color:var(--app-text);padding:6px 4px;cursor:pointer}.rt-tabs>button>span{font-size:20px;line-height:1}.rt-tabs>button>b{font-size:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rt-tabs>button.active{color:var(--app-primary);background:color-mix(in srgb,var(--app-primary) 12%,transparent)}.rt-tabs button:focus-visible,.rt-drawer button:focus-visible{outline:2px solid var(--app-primary);outline-offset:-2px}.rt-menu-floating{position:absolute;top:8px;right:10px;z-index:4;background:var(--app-background);box-shadow:0 3px 12px #0002}.rt-menu-layer{position:absolute;inset:0;z-index:30}.rt-menu-shade{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:#29173f70}.rt-drawer{position:absolute;top:0;bottom:0;left:0;width:min(85%,290px);background:var(--app-background);color:var(--app-text);display:flex;flex-direction:column;padding:12px;box-shadow:5px 0 25px #0003}.rt-drawer-heading{display:flex;align-items:center;gap:10px;padding:4px 0 16px}.rt-drawer-heading strong{flex:1;overflow-wrap:anywhere;font-size:16px}.rt-drawer-heading button{border:0;background:transparent;color:inherit;font-size:21px;width:44px;height:44px}.rt-drawer nav{overflow:auto;min-height:0;flex:1}.rt-drawer nav button{display:flex;align-items:center;gap:14px;width:100%;min-height:48px;padding:12px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;font-size:14px}.rt-drawer nav button span{font-size:20px;width:24px;text-align:center}.rt-drawer nav button.active{background:var(--app-primary);color:var(--app-on-primary)}

.rt-badge{display:inline-block;padding:5px 11px;border-radius:var(--node-radius,20px);background:var(--node-background,var(--app-primary));color:var(--node-color,var(--app-on-primary));font-size:inherit;font-weight:700}.rt-range-label output,.rt-progress-label>span{float:right;font-weight:800;color:var(--app-primary)}.rt-range-label input[type=range]{accent-color:var(--app-primary);padding:8px 0;min-height:40px;border:0;background:transparent;cursor:pointer}.rt-progress-label progress{display:block;width:100%;height:20px;margin-top:9px;accent-color:var(--app-primary)}.rt-rating>span{display:block;font-size:inherit;font-weight:700;margin-bottom:7px}.rt-rating>div{display:flex;flex-wrap:wrap;gap:3px}.rt-rating button{border:0;background:transparent;color:#c9b9ce;font-size:28px;min-height:40px;min-width:36px;padding:2px;cursor:pointer}.rt-rating button.active{color:#c58a00}.rt-form{display:flex;flex-direction:column;border:1px solid #29173f20;border-radius:var(--node-radius,10px);padding:8px}.rt-form h3{font-size:inherit;margin:6px 10px 10px}.rt-accordion{border:1px solid #29173f20;border-radius:var(--node-radius,10px);overflow:hidden}.rt-accordion>summary{padding:14px;min-height:44px;cursor:pointer;font-weight:700;font-size:inherit}.rt-accordion-content{display:flex;flex-direction:column;padding:4px 8px 10px}.rt-accordion[open]>summary{border-bottom:1px solid #29173f15}
`;
