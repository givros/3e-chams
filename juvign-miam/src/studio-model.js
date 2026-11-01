export const catalog=[
 ['heading','Titre','T'],['text','Texte','¶'],['image','Image','▧'],['button','Bouton','↗'],
 ['input','Saisie','⌨'],['number','Nombre','123'],['textarea','Texte long','≡'],['select','Choix','▾'],['toggle','Interrupteur','◉'],
 ['container','Groupe d’éléments','□'],['list','Liste','☷'],['products','Liste de produits','▦'],['cart','Panier','＋'],['divider','Séparateur','—'],['spacer','Espacement','↕']
].map(([type,label,icon])=>({type,label,icon}));
export const actionTypes=[['set','Remplacer une donnée'],['increment','Ajouter ou retirer un nombre'],['append','Ajouter à une liste'],['remove','Retirer de la liste'],['navigate','Changer d’écran'],['if','Si / sinon'],['toast','Afficher un message'],['cartAdd','Ajouter au panier'],['reset','Réinitialiser les données']];
export const uid=prefix=>prefix+'_'+crypto.randomUUID().slice(0,8);
export function blankProject(){const screen=uid('screen');return {version:3,id:uid('app'),name:'Mon application',home:screen,theme:{primary:'#6339c7',background:'#fff8ef',text:'#29173f',radius:12},screens:[{id:screen,name:'Accueil',background:'#fff8ef',nodes:[]}],variables:[]};}
export function variable(p,name,type='text',initial=''){
 let unique=name.replace(/[^a-zA-Z0-9_]/g,'')||'data';if(!/^[a-zA-Z_]/.test(unique))unique='data'+unique;
 if(['__proto__','constructor','prototype'].includes(unique))unique='data_'+unique;
 const base=unique;let n=2;while(p.variables.some(v=>v.name===unique))unique=base+n++;
 const labels={input:'Texte saisi',number:'Nombre',enabled:'Interrupteur',items:'Ma liste',products:'Mes produits',cart:'Mon panier'};
 const v={name:unique,label:(labels[name]||name)+(unique!==base?' '+unique.slice(base.length):''),type,initial,fields:type==='list'&&initial.some(x=>x&&typeof x==='object')?Object.keys(initial[0]).map(name=>({name,label:({name:'Nom',price:'Prix',image:'Photo',quantity:'Quantité'})[name]||name,type:typeof initial[0][name]==='number'?'number':typeof initial[0][name]==='boolean'?'boolean':typeof initial[0][name]==='string'&&/^(assets\/|data:image\/)/.test(initial[0][name])?'image':'text'})):[]};p.variables.push(v);return v;
}
export function component(type,p){
 const node={id:uid('node'),type,name:catalog.find(c=>c.type===type)?.label||type,props:{text:type==='heading'?'Mon titre':type==='button'?'Mon bouton':'Mon texte'},style:{padding:12,gap:10,fontSize:type==='heading'?26:14,align:'left',width:'100%',radius:10,color:'',background:''},events:{click:[],change:[],item:[]},children:[]};
 if(type==='image')Object.assign(node.props,{src:'assets/pizza.jpg',alt:'Image',height:180,fit:'cover'});
 if(['input','number','textarea','toggle','select'].includes(type)){
  const kind=type==='number'?'number':type==='toggle'?'boolean':'text';const v=variable(p,type==='number'?'number':type==='toggle'?'enabled':'input',kind,kind==='number'?0:kind==='boolean'?false:'');
  Object.assign(node.props,{label:type==='toggle'?'Activer':type==='number'?'Nombre':'Texte à saisir',placeholder:'Saisir une valeur',variable:v.name,options:'Premier choix\nDeuxième choix'});
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
 return node;
}
export function walk(p,fn){for(const s of p.screens){const visit=(nodes,parent)=>{for(const n of nodes){fn(n,s,nodes,parent);visit(n.children||[],n);}};visit(s.nodes,null);}}
export function findNode(p,id){let result;walk(p,(node,screen,siblings,parent)=>{if(node.id===id)result={node,screen,siblings,parent};});return result;}
export function duplicateNode(node){const copy=structuredClone(node);const visit=n=>{n.id=uid('node');for(const child of n.children||[])visit(child);};visit(copy);return copy;}
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
 if(!p||p.version!==3||typeof p.id!=='string'||typeof p.name!=='string'||!p.theme||!Array.isArray(p.screens)||!p.screens.length||!Array.isArray(p.variables))return false;
 if(!['primary','background','text'].every(k=>/^#[0-9a-f]{6}$/i.test(p.theme[k]))||!Number.isFinite(p.theme.radius))return false;
 const ids=new Set(),names=new Set();for(const v of p.variables){if(!v||typeof v.name!=='string'||!/^\w+$/.test(v.name)||['__proto__','constructor','prototype'].includes(v.name)||names.has(v.name)||!['text','number','boolean','list','computed'].includes(v.type))return false;names.add(v.name);if(v.type==='list'&&(!Array.isArray(v.initial)||!Array.isArray(v.fields)||v.fields.some(f=>!f||!/^\w+$/.test(f.name)||['__proto__','constructor','prototype'].includes(f.name)||!['text','number','boolean','image'].includes(f.type))))return false;if(v.type==='text'&&typeof v.initial!=='string'||v.type==='boolean'&&typeof v.initial!=='boolean')return false;if(v.type==='number'&&(typeof v.initial!=='number'||!Number.isFinite(v.initial)))return false;}
 let ok=true;const validOperand=(v,depth=0)=>!v||depth<=30&&typeof v==='object'&&['literal','variable','input','item','length','cartTotal','math'].includes(v.kind)&&(v.kind!=='math'||validOperand(v.a,depth+1)&&validOperand(v.b,depth+1));const validActions=(list,depth=0)=>Array.isArray(list)&&depth<=30&&list.every(a=>a&&actionTypes.some(([type])=>type===a.type)&&validOperand(a.value)&&(a.type!=='if'||Array.isArray(a.conditions)&&a.conditions.every(c=>c&&validOperand(c.left)&&validOperand(c.right))&&validActions(a.then||[],depth+1)&&validActions(a.else||[],depth+1)));const visit=(nodes,depth)=>{if(depth>30||!Array.isArray(nodes)){ok=false;return;}for(const n of nodes){if(!n||typeof n.id!=='string'||ids.has(n.id)||!catalog.some(c=>c.type===n.type)||!n.props||!n.style||!n.events||!Object.values(n.events).every(actions=>validActions(actions))){ok=false;return;}ids.add(n.id);visit(n.children||[],depth+1);}};
 for(const v of p.variables)if(v.type==='computed'&&!validOperand(v.formula))return false;
 for(const s of p.screens){if(!s||typeof s.id!=='string'||typeof s.name!=='string'||ids.has(s.id)){ok=false;break;}ids.add(s.id);visit(s.nodes,0);}
 return ok&&p.screens.some(s=>s.id===p.home);
}
