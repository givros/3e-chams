export const catalog=[
 ['heading','Titre','T'],['text','Texte','¶'],['image','Image','▧'],['button','Bouton','↗'],['back','Retour','←'],
 ['input','Saisie','⌨'],['number','Nombre','123'],['textarea','Texte long','≡'],['select','Choix','▾'],['toggle','Interrupteur','◉'],
 ['search','Recherche','⌕'],['date','Date','▦'],['range','Curseur','↔'],['rating','Étoiles','★'],['progress','Progression','▰'],['badge','Étiquette','●'],['form','Formulaire','▤'],['accordion','Volet dépliant','⌄'],
 ['container','Groupe d’éléments','□'],['list','Liste','☷'],['products','Liste de produits','▦'],['cart','Panier','＋'],['divider','Séparateur','—'],['spacer','Espacement','↕']
].map(([type,label,icon])=>({type,label,icon}));
export const actionTypes=[['set','Remplacer une donnée'],['increment','Ajouter ou retirer un nombre'],['append','Ajouter à une liste'],['remove','Retirer de la liste'],['navigate','Changer d’écran'],['back','Revenir à l’écran précédent'],['validate','Vérifier les champs'],['if','Si / sinon'],['toast','Afficher un message'],['cartAdd','Ajouter au panier'],['reset','Réinitialiser les données']];
export const uid=prefix=>prefix+'_'+crypto.randomUUID().slice(0,8);
export function blankProject(){const screen=uid('screen');return {version:3,id:uid('app'),name:'Mon application',home:screen,theme:{primary:'#6339c7',background:'#fff8ef',text:'#29173f',radius:12},screens:[{id:screen,name:'Accueil',background:'#fff8ef',nodes:[]}],variables:[]};}
export function variable(p,name,type='text',initial=''){
 let unique=name.replace(/[^a-zA-Z0-9_]/g,'')||'data';if(!/^[a-zA-Z_]/.test(unique))unique='data'+unique;
 if(['__proto__','constructor','prototype'].includes(unique))unique='data_'+unique;
 const base=unique;let n=2;while(p.variables.some(v=>v.name===unique))unique=base+n++;
 const labels={input:'Texte saisi',number:'Nombre',enabled:'Interrupteur',items:'Ma liste',products:'Mes produits',cart:'Mon panier'};
 const sample=type==='list'&&Array.isArray(initial)?initial.find(x=>x&&typeof x==='object'&&!Array.isArray(x)):null;
 const v={name:unique,label:(labels[name]||name)+(unique!==base?' '+unique.slice(base.length):''),type,initial,fields:sample?Object.keys(sample).map(name=>({name,label:({name:'Nom',price:'Prix',image:'Photo',quantity:'Quantité'})[name]||name,type:typeof sample[name]==='number'?'number':typeof sample[name]==='boolean'?'boolean':typeof sample[name]==='string'&&/^(assets\/|data:image\/)/.test(sample[name])?'image':'text'})):[]};p.variables.push(v);return v;
}
export function component(type,p){
 const node={id:uid('node'),type,name:catalog.find(c=>c.type===type)?.label||type,props:{text:type==='heading'?'Mon titre':type==='button'?'Mon bouton':'Mon texte'},style:{padding:12,gap:10,fontSize:type==='heading'?26:14,align:'left',width:'100%',radius:10,color:'',background:''},events:{click:[],change:[],item:[]},children:[]};
 if(type==='image')Object.assign(node.props,{src:'assets/pizza.jpg',alt:'Image',height:180,fit:'cover'});
 if(['input','number','textarea','toggle','select','search','date','range','rating'].includes(type)){
  const kind=['number','range','rating'].includes(type)?'number':type==='toggle'?'boolean':'text';const v=variable(p,kind==='number'?'number':type==='toggle'?'enabled':type==='search'?'search':'input',kind,kind==='number'?(type==='range'?50:0):kind==='boolean'?false:'');
  Object.assign(node.props,{label:type==='toggle'?'Activer':type==='number'?'Nombre':'Texte à saisir',placeholder:'Saisir une valeur',variable:v.name,options:'Premier choix\nDeuxième choix'});
 }
 if(type==='search')Object.assign(node.props,{label:'Rechercher',placeholder:'Un article, un nom…'});
 if(type==='date')Object.assign(node.props,{label:'Choisir une date',placeholder:''});
 if(type==='range')Object.assign(node.props,{label:'Valeur',min:0,max:100,step:1});
 if(type==='rating')Object.assign(node.props,{label:'Ton avis',max:5});
 if(type==='progress'){const v=variable(p,'progress','number',0);Object.assign(node.props,{label:'Progression',variable:v.name,max:100});}
 if(type==='badge')node.props.text='Nouveau';
 if(type==='accordion')Object.assign(node.props,{title:'En savoir plus',open:false});
 if(type==='form'){
  node.props.title='Mon formulaire';const entry=component('input',p),submit=component('button',p);entry.props.label='Ton prénom';entry.props.required=true;submit.props.text='Valider';submit.events.click=[{type:'validate',form:node.id},{type:'toast',value:{kind:'literal',value:'Formulaire validé (simulation).'}}];node.children=[entry,submit];
 }
 if(type==='container')Object.assign(node.props,{direction:'column'});
 if(type==='list'){const v=variable(p,'items','list',['Premier élément']);Object.assign(node.props,{variable:v.name,itemText:'{{item.name}}',removable:true,itemButton:'',empty:'Liste vide'});}
 if(type==='products'){
  const v=variable(p,'products','list',[{name:'Premier article',price:10,image:'assets/pizza.jpg'}]),cart=p.variables.find(v=>v.name==='cart'&&v.type==='list')||variable(p,'cart','list',[]);
  Object.assign(node.props,{variable:v.name,nameField:'name',priceField:'price',imageField:'image',itemButton:'Ajouter',empty:'Aucun article'});node.events.item=[{type:'cartAdd',variable:cart.name,quantity:1}];
 }
 if(type==='cart'){
  const v=p.variables.find(v=>v.name==='cart'&&v.type==='list')||variable(p,'cart','list',[]);Object.assign(node.props,{variable:v.name,delivery:0,freeAt:0,discountVariable:'',checkout:'Confirmer',empty:'Panier vide'});node.events.click=[{type:'toast',value:{kind:'literal',value:'Commande simulée confirmée.'}}];
 }
 if(type==='spacer')node.props.height=30;
 if(type==='back'){node.props.text='← Retour';node.events.click=[{type:'back'}];}
 return node;
}
export function walk(p,fn){for(const s of p.screens){const visit=(nodes,parent)=>{for(const n of nodes){fn(n,s,nodes,parent);visit(n.children||[],n);}};visit(s.nodes,null);}}
export function findNode(p,id){let result;walk(p,(node,screen,siblings,parent)=>{if(node.id===id)result={node,screen,siblings,parent};});return result;}
export function duplicateNode(node){
 const copy=structuredClone(node),ids=new Map();const visit=n=>{const old=n.id;n.id=uid('node');ids.set(old,n.id);for(const child of n.children||[])visit(child);};visit(copy);
 const actions=list=>{for(const a of list||[]){if(ids.has(a.form))a.form=ids.get(a.form);if(a.type==='if'){actions(a.then);actions(a.else);}}};
 const remap=n=>{Object.values(n.events||{}).forEach(actions);(n.children||[]).forEach(remap);};remap(copy);return copy;
}
export function operand(kind='literal',value=''){return kind==='variable'?{kind,name:value}:kind==='math'?{kind,op:'add',a:{kind:'literal',value:0},b:{kind:'literal',value:1}}:{kind,value};}
export function action(type,p){const number=p.variables.find(v=>v.type==='number'),list=p.variables.find(v=>v.type==='list'),any=p.variables[0];return {
 type,variable:(type==='increment'?number:type==='append'||type==='remove'||type==='cartAdd'?list:any)?.name||'',
 value:operand('literal',type==='toast'?'Message':''),delta:1,screen:p.screens[0]?.id,quantity:1,
 ...(type==='if'?{conditions:[{left:operand('variable',number?.name||any?.name||''),op:'gte',right:operand('literal',10)}],join:'and',then:[],else:[]}: {})
};}
export function restaurantTemplate(){
 const p=blankProject();p.name='Mon restaurant';p.theme.primary='#ff5a2e';
 const products=component('products',p),title=component('heading',p),photo=component('image',p),go=component('button',p),cart=component('cart',p);
 title.props.text='Mon restaurant';photo.props.src='assets/burger.jpg';go.props.text='Ouvrir le panier';
 p.variables.find(v=>v.name===products.props.variable).initial=[{name:'Burger',price:10,image:'assets/burger.jpg'},{name:'Frites',price:4,image:'assets/fries.jpg'},{name:'Boisson',price:3,image:'assets/drink.jpg'}];
 const cartScreen={id:uid('screen'),name:'Panier',background:'#fff8ef',nodes:[]},back=component('button',p),cartTitle=component('heading',p);cartTitle.props.text='Panier';back.props.text='Retour';back.events.click=[{type:'navigate',screen:p.home}];go.events.click=[{type:'navigate',screen:cartScreen.id}];cart.props.delivery=2.5;cart.props.freeAt=25;cartScreen.nodes=[cartTitle,cart,back];p.screens[0].nodes=[title,photo,products,go];p.screens.push(cartScreen);return p;
}
export function tasksTemplate(){
 const p=blankProject();p.name='Mes tâches';const input=component('input',p),list=component('list',p),title=component('heading',p),button=component('button',p);title.props.text='Mes tâches';input.props.label='Nouvelle tâche';button.props.text='Ajouter';p.variables.find(v=>v.name===list.props.variable).initial=[];
 button.events.click=[{type:'if',conditions:[{left:operand('variable',input.props.variable),op:'neq',right:operand('literal','')}],join:'and',then:[{type:'append',variable:list.props.variable,value:operand('variable',input.props.variable)},{type:'set',variable:input.props.variable,value:operand('literal','')}],else:[{type:'toast',value:operand('literal','Saisis une tâche.') }]}];p.screens[0].nodes=[title,input,button,list];return p;
}
export function validateProject(p){
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const safeKey=k=>!['__proto__','constructor','prototype'].includes(k);
 const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]+$/.test(v)&&safeKey(v);
 const dataName=v=>typeof v==='string'&&/^\w+$/.test(v)&&safeKey(v);
 const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 // Imports must remain safe to traverse and render, even if not produced by this editor.
 let count=0;const safeJSON=(v,depth=0)=>{
  if(depth>60||++count>200000)return false;
  if(v===null||v===undefined||typeof v==='string'||typeof v==='boolean')return true;
  if(typeof v==='number')return Number.isFinite(v);
  if(Array.isArray(v))return v.every(x=>safeJSON(x,depth+1));
  return object(v)&&Object.entries(v).every(([k,x])=>safeKey(k)&&safeJSON(x,depth+1));
 };
 // Check the original values: JSON.stringify would silently turn Infinity into null.
 if(!safeJSON(p))return false;
 if(!object(p)||p.version!==3||!identifier(p.id)||typeof p.name!=='string'||!object(p.theme)||!Array.isArray(p.screens)||!p.screens.length||!Array.isArray(p.variables))return false;
 if(!['primary','background','text'].every(k=>color(p.theme[k]))||!Number.isFinite(p.theme.radius))return false;
 if(p.navigation!==undefined){const nav=p.navigation;if(!object(nav)||typeof nav.enabled!=='boolean'||!['tabs','drawer'].includes(nav.style)||!Array.isArray(nav.items)||!nav.items.every(identifier)||new Set(nav.items).size!==nav.items.length||['showHeader','showBack'].some(k=>nav[k]!==undefined&&typeof nav[k]!=='boolean'))return false;}
 const ids=new Set(),names=new Set();
 for(const v of p.variables){
  if(!object(v)||!dataName(v.name)||names.has(v.name)||typeof (v.label??v.name)!=='string'||!['text','number','boolean','list','computed'].includes(v.type))return false;
  names.add(v.name);
  if(v.type==='list'){
   if(!Array.isArray(v.initial)||!Array.isArray(v.fields))return false;
   const fields=new Set();for(const f of v.fields){if(!object(f)||!dataName(f.name)||fields.has(f.name)||typeof (f.label??f.name)!=='string'||!['text','number','boolean','image'].includes(f.type))return false;fields.add(f.name);}
  }
  if(v.type==='text'&&typeof v.initial!=='string'||v.type==='boolean'&&typeof v.initial!=='boolean'||v.type==='number'&&!Number.isFinite(v.initial))return false;
 }
 const validOperand=(v,depth=0)=>{
  if(v===undefined)return true;
  if(depth>30||!object(v)||!['literal','variable','input','item','length','cartTotal','math'].includes(v.kind))return false;
  if(v.kind==='math')return ['add','subtract','multiply','divide'].includes(v.op)&&!!v.a&&!!v.b&&validOperand(v.a,depth+1)&&validOperand(v.b,depth+1);
  if(['variable','length','cartTotal'].includes(v.kind))return v.name===undefined||v.name===''||dataName(v.name);
  return v.kind!=='item'||v.field===undefined||typeof v.field==='string';
 };
 const validActions=(list,depth=0)=>Array.isArray(list)&&depth<=30&&list.every(a=>object(a)&&actionTypes.some(([type])=>type===a.type)&&validOperand(a.value)&&(!Object.hasOwn(a,'variable')||a.variable===''||dataName(a.variable))&&(!Object.hasOwn(a,'screen')||a.screen===''||identifier(a.screen))&&['delta','quantity'].every(k=>a[k]===undefined||Number.isFinite(a[k]))&&(a.type!=='if'||Array.isArray(a.conditions)&&[undefined,'and','or'].includes(a.join)&&a.conditions.every(c=>object(c)&&['eq','neq','gt','gte','lt','lte','contains','empty'].includes(c.op)&&validOperand(c.left)&&validOperand(c.right))&&validActions(a.then||[],depth+1)&&validActions(a.else||[],depth+1)));
 const visit=(nodes,depth=0)=>{
  if(depth>30||!Array.isArray(nodes))return false;
  for(const n of nodes){
   if(!object(n)||!identifier(n.id)||ids.has(n.id)||typeof n.name!=='string'||!catalog.some(c=>c.type===n.type)||!object(n.props)||!object(n.style)||!object(n.events)||!['click','change','item'].every(k=>validActions(n.events[k]))||Object.keys(n.events).some(k=>!['click','change','item'].includes(k)))return false;
   if(!['padding','gap','fontSize','radius'].every(k=>n.style[k]===undefined||Number.isFinite(n.style[k])))return false;
   ids.add(n.id);if(!visit(n.children||[],depth+1))return false;
  }return true;
 };
 for(const v of p.variables)if(v.type==='computed'&&!validOperand(v.formula))return false;
 for(const screen of p.screens){if(!object(screen)||!identifier(screen.id)||typeof screen.name!=='string'||ids.has(screen.id)||(screen.background!==undefined&&!color(screen.background)))return false;ids.add(screen.id);if(!visit(screen.nodes))return false;}
 return p.screens.some(s=>s.id===p.home);
}
